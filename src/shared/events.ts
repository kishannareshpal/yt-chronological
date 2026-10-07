export const OPEN_DIALOG = 'oldest-first:open-dialog';
export const SAVED_SETS_CHANGED = 'oldest-first:saved-sets-changed';
export const SAVE_SESSION_CHANGED = 'oldest-first:save-session-changed';
export const LAST_WATCHED_CHANGED = 'oldest-first:last-watched-changed';

export function emit(eventName: string): void {
  document.dispatchEvent(new CustomEvent(eventName));
}
