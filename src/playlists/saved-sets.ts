import { emit, SAVED_SETS_CHANGED } from '../shared/events.ts';
import type { UploadKind } from '../uploads/fetch-uploads.ts';
import { setTitle, type PlaylistPart } from './plan-parts.ts';
import type { Privacy } from './youtube-playlists.ts';

export type SetMember = { channelId: string; title: string; avatarUrl: string | null; kinds: UploadKind[] };

/** One or more channels saved together into the same playlists, ordered by publish time. */
export type SavedSet = { setId: string; members: SetMember[]; privacy: Privacy; parts: PlaylistPart[] };

export type Preferences = { kinds: UploadKind[]; privacy: Privacy };

const DEFAULT_PREFERENCES: Preferences = { kinds: ['videos'], privacy: 'PRIVATE' };

const SET_KEY_PREFIX = 'oldest-first:set:';
const LEGACY_CHANNEL_KEY_PREFIX = 'oldest-first:channel:';
const CHANNEL_INDEX_KEY = 'oldest-first:channel-sets';
const PLAYLIST_INDEX_KEY = 'oldest-first:playlists';
const PREFERENCES_KEY = 'oldest-first:preferences';

const setKey = (setId: string) => `${SET_KEY_PREFIX}${setId}`;

type Index = Record<string, string>;
type LegacySavedChannel = { channelId: string; channelTitle: string; kinds: UploadKind[]; privacy: Privacy; parts: PlaylistPart[] };

// The in-page button checks the saved set on every DOM change, so parsing is skipped while the stored text is unchanged.
const parsedSets = new Map<string, { raw: string; set: SavedSet }>();

export function loadSet(setId: string): SavedSet | null {
  migrateLegacyChannels();
  const key = setKey(setId);
  const raw = readRaw(key);
  if (!raw) return null;
  const cached = parsedSets.get(key);
  if (cached?.raw === raw) return cached.set;
  try {
    const set = JSON.parse(raw) as SavedSet;
    parsedSets.set(key, { raw, set });
    return set;
  } catch {
    return null;
  }
}

export function loadSetForChannel(channelId: string): SavedSet | null {
  migrateLegacyChannels();
  const setId = readJson<Index>(CHANNEL_INDEX_KEY)?.[channelId];
  return setId ? loadSet(setId) : null;
}

export function setIdForPlaylist(playlistId: string): string | null {
  migrateLegacyChannels();
  return readJson<Index>(PLAYLIST_INDEX_KEY)?.[playlistId] ?? null;
}

export function listSets(): SavedSet[] {
  migrateLegacyChannels();
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(SET_KEY_PREFIX))
    .flatMap((key) => loadSet(key.slice(SET_KEY_PREFIX.length)) ?? []);
}

export function storeSet(set: SavedSet): void {
  writeJson(setKey(set.setId), set);

  const channels = readJson<Index>(CHANNEL_INDEX_KEY) ?? {};
  for (const [channelId, setId] of Object.entries(channels)) {
    if (setId === set.setId) delete channels[channelId];
  }
  for (const member of set.members) channels[member.channelId] = set.setId;
  writeJson(CHANNEL_INDEX_KEY, channels);

  const playlists = readJson<Index>(PLAYLIST_INDEX_KEY) ?? {};
  for (const part of set.parts) if (part.playlistId) playlists[part.playlistId] = set.setId;
  writeJson(PLAYLIST_INDEX_KEY, playlists);

  emit(SAVED_SETS_CHANGED);
}

export function newSetId(): string {
  return crypto.randomUUID();
}

export function setName(set: Pick<SavedSet, 'members'>): string {
  return setTitle(set.members.map((member) => member.title), 0, 1).replace(/ · Oldest first$/, '');
}

export function isComplete(set: SavedSet): boolean {
  return set.parts.every((part) => part.playlistId && !part.needsReorder && part.addedCount >= part.videoIds.length);
}

export function setTotals(set: SavedSet): { total: number; added: number } {
  return set.parts.reduce(
    (totals, part) => ({
      total: totals.total + part.videoIds.length,
      added: totals.added + Math.min(part.addedCount, part.videoIds.length),
    }),
    { total: 0, added: 0 },
  );
}

export function setVideoIds(set: SavedSet): Set<string> {
  return new Set(set.parts.flatMap((part) => part.videoIds));
}

export function loadPreferences(): Preferences {
  return { ...DEFAULT_PREFERENCES, ...readJson<Partial<Preferences>>(PREFERENCES_KEY) };
}

export function storePreferences(preferences: Preferences): void {
  writeJson(PREFERENCES_KEY, preferences);
}

let migrated = false;

// Before sets existed, each channel was saved on its own. Those become one-channel sets with the channel id as the
// set id, which keeps the playlist index and the last watched video, both keyed by that id, valid as they are.
function migrateLegacyChannels() {
  if (migrated) return;
  migrated = true;
  let legacyKeys: string[];
  try {
    legacyKeys = Object.keys(localStorage).filter((key) => key.startsWith(LEGACY_CHANNEL_KEY_PREFIX));
  } catch {
    return;
  }
  for (const key of legacyKeys) {
    const legacy = readJson<LegacySavedChannel>(key);
    if (legacy) {
      storeSet({
        setId: legacy.channelId,
        members: [{ channelId: legacy.channelId, title: legacy.channelTitle, avatarUrl: null, kinds: legacy.kinds }],
        privacy: legacy.privacy,
        parts: legacy.parts,
      });
    }
    localStorage.removeItem(key);
  }
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error('Your browser ran out of space to remember these playlists.', { cause: error });
  }
}
