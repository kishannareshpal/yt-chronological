import { parsePlaylistPage } from '../uploads/parse-playlist-page.ts';
import { innertube, InnertubeError } from '../youtube/innertube.ts';
import type { Move, PlaylistItem } from './reconcile.ts';

export type Privacy = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

type CreateResponse = { playlistId?: string };
type EditResponse = { status?: string };

/** YouTube accepts many actions per edit, but smaller batches keep a failure cheap to retry. */
export const EDIT_BATCH_SIZE = 100;

export async function createPlaylist(title: string, privacy: Privacy, signal?: AbortSignal): Promise<string> {
  const response = await innertube<CreateResponse>('playlist/create', { title, privacyStatus: privacy }, signal);
  if (!response.playlistId) throw new InnertubeError('YouTube did not return the new playlist.');
  return response.playlistId;
}

export async function deletePlaylist(playlistId: string, signal?: AbortSignal): Promise<void> {
  await innertube('playlist/delete', { playlistId }, signal);
}

export async function renamePlaylist(playlistId: string, title: string, signal?: AbortSignal): Promise<void> {
  await editPlaylist(playlistId, [{ action: 'ACTION_SET_PLAYLIST_NAME', playlistName: title }], signal);
}

export async function addVideos(playlistId: string, videoIds: readonly string[], signal?: AbortSignal) {
  await editPlaylist(
    playlistId,
    videoIds.map((addedVideoId) => ({
      action: 'ACTION_ADD_VIDEO',
      addedVideoId,
      // A retried batch may have partly landed before the failure, so never add the same video twice.
      dedupeOption: 'DEDUPE_OPTION_SKIP',
    })),
    signal,
  );
}

export async function removeItems(playlistId: string, items: readonly PlaylistItem[], signal?: AbortSignal) {
  await editPlaylist(
    playlistId,
    items.map((item) => ({ action: 'ACTION_REMOVE_VIDEO', setVideoId: item.setVideoId })),
    signal,
  );
}

// Same action YouTube sends when you drag a video in your own playlist. No predecessor means the top.
export async function moveItems(playlistId: string, moves: readonly Move[], signal?: AbortSignal) {
  await editPlaylist(
    playlistId,
    moves.map((move) => ({
      action: 'ACTION_MOVE_VIDEO_AFTER',
      setVideoId: move.setVideoId,
      ...(move.afterSetVideoId ? { movedSetVideoIdPredecessor: move.afterSetVideoId } : {}),
    })),
    signal,
  );
}

/** Reads every entry of a playlist you own, in order. */
export async function readPlaylistItems(playlistId: string, signal?: AbortSignal): Promise<PlaylistItem[]> {
  const items: PlaylistItem[] = [];
  let response: unknown = await innertube('browse', { browseId: `VL${playlistId}` }, signal);
  while (response) {
    const page = parsePlaylistPage(response);
    items.push(...page.items);
    response = page.continuation ? await innertube('browse', { continuation: page.continuation }, signal) : null;
  }
  return items;
}

async function editPlaylist(playlistId: string, actions: object[], signal?: AbortSignal): Promise<void> {
  const response = await innertube<EditResponse>('browse/edit_playlist', { playlistId, actions }, signal);
  if (response.status !== 'STATUS_SUCCEEDED') {
    throw new InnertubeError(`YouTube could not update the playlist (${response.status ?? 'no status'}).`);
  }
}
