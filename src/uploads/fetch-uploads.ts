import { innertube, InnertubeError } from '../youtube/innertube.ts';
import { parsePlaylistPage, parsePlaylistVideoCount } from './parse-playlist-page.ts';

export const UPLOAD_KINDS = ['videos', 'shorts', 'live'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
export type UploadCounts = Record<UploadKind, number>;

// Every channel has these auto-generated playlists: "UC…" ids swap their prefix to list uploads by kind.
const PLAYLIST_PREFIX = { all: 'UU', videos: 'UULF', shorts: 'UUSH', live: 'UULV' } as const;

type Source = keyof typeof PLAYLIST_PREFIX;
type FetchOptions = { onVideosFound?: (count: number) => void; signal?: AbortSignal };

const uploadsPlaylistId = (channelId: string, source: Source) => `${PLAYLIST_PREFIX[source]}${channelId.slice(2)}`;

export async function fetchUploadsOldestFirst(
  channelId: string,
  kinds: readonly UploadKind[],
  options: FetchOptions = {},
): Promise<string[]> {
  const [onlyKind] = kinds;
  if (kinds.length === 1 && onlyKind) {
    return (await fetchPlaylistVideoIds(uploadsPlaylistId(channelId, onlyKind), options)).reverse();
  }

  // The per-kind playlists cannot be merged by date, so the combined "all" playlist provides the order.
  const allUploads = await fetchPlaylistVideoIds(uploadsPlaylistId(channelId, 'all'), options);
  if (kinds.length === UPLOAD_KINDS.length) return allUploads.reverse();

  const wanted = new Set<string>();
  for (const kind of kinds) {
    for (const videoId of await fetchPlaylistVideoIds(uploadsPlaylistId(channelId, kind), options)) wanted.add(videoId);
  }
  return allUploads.filter((videoId) => wanted.has(videoId)).reverse();
}

/** How many videos fetchUploadsOldestFirst reads for these kinds, so progress can be shown as a fraction. */
export function videosToScan(counts: UploadCounts, kinds: readonly UploadKind[]): number {
  const selected = kinds.reduce((sum, kind) => sum + counts[kind], 0);
  if (kinds.length === 1 || kinds.length === UPLOAD_KINDS.length) return selected;
  return totalUploads(counts) + selected;
}

export function totalUploads(counts: UploadCounts, kinds: readonly UploadKind[] = UPLOAD_KINDS): number {
  return kinds.reduce((sum, kind) => sum + counts[kind], 0);
}

export async function countUploads(channelId: string, signal?: AbortSignal): Promise<UploadCounts> {
  const entries = await Promise.all(
    UPLOAD_KINDS.map(async (kind) => {
      const firstPage = await fetchFirstPage(uploadsPlaylistId(channelId, kind), signal);
      return [kind, firstPage ? parsePlaylistVideoCount(firstPage) : 0] as const;
    }),
  );
  return Object.fromEntries(entries) as UploadCounts;
}

export type NewUploads = { count: number; atLeast: boolean };

// Only the newest page of each list is read, which is enough to say "3 new" or "100+ new" without a full scan.
export async function countNewUploads(
  channelId: string,
  kinds: readonly UploadKind[],
  saved: ReadonlySet<string>,
  signal?: AbortSignal,
): Promise<NewUploads> {
  let count = 0;
  let atLeast = false;
  for (const kind of kinds) {
    const firstPage = await fetchFirstPage(uploadsPlaylistId(channelId, kind), signal);
    if (!firstPage) continue;
    const page = parsePlaylistPage(firstPage);
    const fresh = page.videoIds.filter((videoId) => !saved.has(videoId));
    count += fresh.length;
    if (fresh.length === page.videoIds.length && page.continuation) atLeast = true;
  }
  return { count, atLeast };
}

async function fetchFirstPage(playlistId: string, signal?: AbortSignal): Promise<unknown | null> {
  try {
    return await innertube('browse', { browseId: `VL${playlistId}` }, signal);
  } catch (error) {
    if (error instanceof InnertubeError && (error.status === 400 || error.status === 404)) return null;
    throw error;
  }
}

async function fetchPlaylistVideoIds(playlistId: string, { onVideosFound, signal }: FetchOptions) {
  const videoIds = new Set<string>();
  let response = await fetchFirstPage(playlistId, signal);

  while (response) {
    const page = parsePlaylistPage(response);
    page.videoIds.forEach((videoId) => videoIds.add(videoId));
    onVideosFound?.(page.videoIds.length);
    response = page.continuation
      ? await innertube('browse', { continuation: page.continuation }, signal)
      : null;
  }
  return [...videoIds];
}
