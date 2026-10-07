import { fetchUploadsOldestFirst } from '../uploads/fetch-uploads.ts';
import { publishTimes } from '../uploads/publish-dates.ts';
import { InnertubeError, sleep } from '../youtube/innertube.ts';
import { mergeByPublishTime } from './merge-uploads.ts';
import { partsForTarget, setTitle, type PlaylistPart } from './plan-parts.ts';
import { planMoves, planRemovals } from './reconcile.ts';
import { storeSet, type SavedSet } from './saved-sets.ts';
import {
  addVideos,
  createPlaylist,
  deletePlaylist,
  EDIT_BATCH_SIZE,
  moveItems,
  readPlaylistItems,
  removeItems,
  renamePlaylist,
} from './youtube-playlists.ts';

export type SaveProgress =
  | { stage: 'finding'; scanned: number }
  | { stage: 'dating'; done: number; total: number }
  | { stage: 'checking' }
  /** added and total count the additions of this save, across every part. */
  | { stage: 'saving'; part: number; partCount: number; added: number; total: number }
  | { stage: 'ordering'; done: number; total: number };

export type SaveResult = { added: number; removed: number; moved: number; skipped: number };

type SaveOptions = { onProgress: (progress: SaveProgress) => void; signal: AbortSignal };

/**
 * Brings a set's playlists in line with its channels' uploads, oldest first.
 * New uploads at the end are simply appended. When videos land in the middle, such as after joining another
 * channel, the affected playlists are read back, trimmed, topped up and reordered with as few moves as possible.
 * Progress is stored after every step, so an interrupted save resumes where it stopped.
 */
export async function saveSet(set: SavedSet, { onProgress, signal }: SaveOptions): Promise<SaveResult> {
  const target = await targetOrder(set, onProgress, signal);
  const { parts, dropped } = partsForTarget(set.parts, target);
  set.parts = parts;
  storeSet(set);

  const result: SaveResult = { added: 0, removed: 0, moved: 0, skipped: 0 };
  const reordering = parts.filter((part) => part.needsReorder);

  // Removals go first everywhere, so no playlist goes over 5,000 while videos shift between parts.
  const alreadyThere = new Map<PlaylistPart, Set<string>>();
  if (reordering.length > 0) onProgress({ stage: 'checking' });
  for (const part of reordering) {
    const items = await readPlaylistItems(part.playlistId!, signal);
    const removals = planRemovals(items, part.videoIds);
    for (const batch of batches(removals)) {
      await pauseBetweenWrites(signal);
      await removeItems(part.playlistId!, batch, signal);
      result.removed += batch.length;
    }
    const removed = new Set(removals.map((item) => item.setVideoId));
    alreadyThere.set(part, new Set(items.filter((item) => !removed.has(item.setVideoId)).map((item) => item.videoId)));
  }

  const additions = parts.map((part) =>
    part.needsReorder ? part.videoIds.filter((videoId) => !alreadyThere.get(part)?.has(videoId)) : part.videoIds.slice(part.addedCount),
  );
  const totalAdditions = additions.reduce((sum, videoIds) => sum + videoIds.length, 0);
  let added = 0;
  const titles = set.members.map((member) => member.title);

  for (const [index, part] of parts.entries()) {
    const report = () =>
      onProgress({ stage: 'saving', part: index + 1, partCount: parts.length, added, total: totalAdditions });
    await ensurePlaylist(set, part, setTitle(titles, index, parts.length), signal);
    report();

    for (const batch of batches(additions[index]!)) {
      const skipped = await addBatch(part.playlistId!, batch, signal);
      added += batch.length;
      result.added += batch.length - skipped;
      result.skipped += skipped;
      if (!part.needsReorder) part.addedCount += batch.length;
      storeSet(set);
      report();
    }
  }

  const moveCounts = new Map<PlaylistPart, number>();
  let moved = 0;
  for (const part of reordering) {
    const moves = planMoves(await readPlaylistItems(part.playlistId!, signal), part.videoIds);
    moveCounts.set(part, moves.length);
    const totalMoves = [...moveCounts.values()].reduce((sum, count) => sum + count, 0);
    onProgress({ stage: 'ordering', done: moved, total: totalMoves });
    for (const batch of batches(moves)) {
      await pauseBetweenWrites(signal);
      await moveItems(part.playlistId!, batch, signal);
      moved += batch.length;
      onProgress({ stage: 'ordering', done: moved, total: totalMoves });
    }
    part.needsReorder = false;
    part.addedCount = part.videoIds.length;
    storeSet(set);
  }
  result.moved = moved;

  // Only playlists this extension created end up here, and their videos now live in the other parts.
  for (const part of dropped) {
    try {
      await deletePlaylist(part.playlistId!, signal);
    } catch (error) {
      // Already deleted by hand is fine. Anything else is worth reporting.
      if (!(error instanceof InnertubeError && error.status !== undefined && error.status < 500)) throw error;
    }
  }
  return result;
}

async function targetOrder(
  set: SavedSet,
  onProgress: SaveOptions['onProgress'],
  signal: AbortSignal,
): Promise<string[]> {
  let scanned = 0;
  const lists: string[][] = [];
  for (const member of set.members) {
    lists.push(
      await fetchUploadsOldestFirst(member.channelId, member.kinds, {
        signal,
        onVideosFound: (count) => onProgress({ stage: 'finding', scanned: (scanned += count) }),
      }),
    );
  }
  if (lists.length === 1) return lists[0]!;

  // Each channel's list is already in order, but interleaving channels needs real publish times.
  const publishedAt = await publishTimes(lists.flat(), {
    signal,
    onProgress: (done, total) => total > 0 && onProgress({ stage: 'dating', done, total }),
  });
  return mergeByPublishTime(lists, publishedAt);
}

async function ensurePlaylist(set: SavedSet, part: PlaylistPart, title: string, signal: AbortSignal) {
  if (!part.playlistId) {
    part.playlistId = await createPlaylist(title, set.privacy, signal);
  } else if (part.title !== title) {
    // Joining a channel or growing past one playlist changes the name, such as "A · Oldest first" to "A + B · Oldest first · Part 1".
    await renamePlaylist(part.playlistId, title, signal);
  } else {
    return;
  }
  part.title = title;
  storeSet(set);
}

async function addBatch(playlistId: string, videoIds: string[], signal: AbortSignal): Promise<number> {
  const batchError = await tryAddVideos(playlistId, videoIds, signal);
  if (!batchError) return 0;

  // One unavailable video can reject a whole batch, so retry one at a time and skip the ones YouTube refuses.
  let skipped = 0;
  for (const videoId of videoIds) {
    if (await tryAddVideos(playlistId, [videoId], signal)) skipped++;
  }
  // Every video failing points at the account or session rather than the videos, so stop instead of skipping them all.
  if (skipped === videoIds.length && videoIds.length > 1) throw batchError;
  return skipped;
}

async function tryAddVideos(playlistId: string, videoIds: string[], signal: AbortSignal) {
  await pauseBetweenWrites(signal);
  try {
    await addVideos(playlistId, videoIds, signal);
    return null;
  } catch (error) {
    if (error instanceof InnertubeError && (error.status === undefined || error.status === 400)) return error;
    throw error;
  }
}

function pauseBetweenWrites(signal: AbortSignal) {
  return sleep(600 + Math.random() * 800, signal);
}

function batches<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += EDIT_BATCH_SIZE) result.push(items.slice(start, start + EDIT_BATCH_SIZE));
  return result;
}
