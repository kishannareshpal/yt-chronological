import { emit, LAST_WATCHED_CHANGED } from '../shared/events.ts';

// Keyed by set. Sets made from a single channel before sets existed use the channel id, so old bookmarks still match.
const key = (setId: string) => `oldest-first:last-watched:${setId}`;

export function loadLastWatched(setId: string): string | null {
  try {
    return localStorage.getItem(key(setId));
  } catch {
    return null;
  }
}

export function storeLastWatched(setId: string, videoId: string): void {
  if (loadLastWatched(setId) === videoId) return;
  try {
    localStorage.setItem(key(setId), videoId);
  } catch {
    // Losing the bookmark only means the next visit starts from the previous one.
    return;
  }
  emit(LAST_WATCHED_CHANGED);
}
