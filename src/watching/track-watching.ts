import { loadSet, setIdForPlaylist } from '../playlists/saved-sets.ts';
import { storeLastWatched } from './last-watched.ts';
import { nextVideoId, resumePoint, watchUrl } from './resume-point.ts';

// Opening a playlist from YouTube lands on video 1, so a video only becomes your place once you have really watched it.
const WATCHED_SECONDS = 30;

export function trackWatching(): void {
  // Media events do not bubble, so listen in the capture phase.
  document.addEventListener('timeupdate', rememberWatchedVideo, true);
  document.addEventListener('ended', advancePastFinishedVideo, true);
}

function currentPlaylistVideo(): { setId: string; playlistId: string; videoId: string } | null {
  if (location.pathname !== '/watch') return null;
  const params = new URLSearchParams(location.search);
  const videoId = params.get('v');
  const playlistId = params.get('list');
  if (!videoId || !playlistId) return null;
  const setId = setIdForPlaylist(playlistId);
  return setId ? { setId, playlistId, videoId } : null;
}

function mainVideo(event: Event): HTMLVideoElement | null {
  const video = event.target;
  if (!(video instanceof HTMLVideoElement)) return null;
  const player = video.closest('#movie_player');
  return player && !player.classList.contains('ad-showing') ? video : null;
}

let rememberedVideoId: string | null = null;

function rememberWatchedVideo(event: Event) {
  const video = mainVideo(event);
  if (!video || video.currentTime < Math.min(WATCHED_SECONDS, (video.duration || Infinity) / 2)) return;

  const current = currentPlaylistVideo();
  if (!current || current.videoId === rememberedVideoId) return;

  rememberedVideoId = current.videoId;
  storeLastWatched(current.setId, current.videoId);
}

function advancePastFinishedVideo(event: Event) {
  if (!mainVideo(event)) return;
  const current = currentPlaylistVideo();
  const set = current && loadSet(current.setId);
  const next = set && nextVideoId(set.parts, current.videoId);
  if (!next) return;
  storeLastWatched(current.setId, next);

  // YouTube stops at the end of each playlist, so carry on into the next part the way autoplay would.
  const point = resumePoint(set.parts, next);
  const autoplayOff = document.querySelector('.ytp-autonav-toggle-button[aria-checked="false"]') !== null;
  if (point && point.playlistId !== current.playlistId && !autoplayOff) location.assign(watchUrl(point));
}
