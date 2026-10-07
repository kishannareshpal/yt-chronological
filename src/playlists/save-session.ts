import { emit, SAVE_SESSION_CHANGED } from '../shared/events.ts';
import { saveSet, type SaveProgress, type SaveResult } from './save-set.ts';
import { setName, type SavedSet } from './saved-sets.ts';

export type SaveSession = {
  setId: string;
  channelIds: string[];
  title: string;
  avatarUrl: string | null;
  progress: SaveProgress | null;
  /** Videos to read while collecting uploads, when known, so that stage can show real progress. */
  toScan: number | null;
  secondsLeft: number | null;
};

export type SaveOutcome =
  | { status: 'done'; result: SaveResult }
  | { status: 'stopped' }
  | { status: 'failed'; error: unknown };

let active: { session: SaveSession; controller: AbortController } | null = null;

export function currentSave(): SaveSession | null {
  return active?.session ?? null;
}

export function stopSave(): void {
  active?.controller.abort();
}

export async function startSave(set: SavedSet, toScan: number | null): Promise<SaveOutcome> {
  if (active) return { status: 'failed', error: new Error('Another set is still being saved.') };

  const controller = new AbortController();
  const session: SaveSession = {
    setId: set.setId,
    channelIds: set.members.map((member) => member.channelId),
    title: setName(set),
    avatarUrl: set.members[0]?.avatarUrl ?? null,
    progress: null,
    toScan,
    secondsLeft: null,
  };
  active = { session, controller };
  window.addEventListener('beforeunload', warnBeforeLeaving);
  emit(SAVE_SESSION_CHANGED);

  const estimate = remainingTimeEstimator();
  try {
    const result = await saveSet(set, {
      signal: controller.signal,
      onProgress: (progress) => {
        session.progress = progress;
        session.secondsLeft = progress.stage === 'saving' ? estimate(progress.added, progress.total) : null;
        emit(SAVE_SESSION_CHANGED);
      },
    });
    return { status: 'done', result };
  } catch (error) {
    return controller.signal.aborted ? { status: 'stopped' } : { status: 'failed', error };
  } finally {
    active = null;
    window.removeEventListener('beforeunload', warnBeforeLeaving);
    emit(SAVE_SESSION_CHANGED);
  }
}

// Measured from the first batch onwards, because YouTube's pace varies by account and time of day.
function remainingTimeEstimator() {
  let start: { at: number; added: number } | null = null;
  return (added: number, total: number): number | null => {
    const now = performance.now();
    if (!start) {
      start = { at: now, added };
      return null;
    }
    const perSecond = (added - start.added) / ((now - start.at) / 1000);
    return perSecond > 0 ? Math.ceil((total - added) / perSecond) : null;
  };
}

function warnBeforeLeaving(event: BeforeUnloadEvent) {
  event.preventDefault();
}
