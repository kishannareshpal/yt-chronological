export const MAX_PLAYLIST_SIZE = 5000;
const MAX_TITLE_LENGTH = 150;
const NAMES_SHOWN = 3;

export type PlaylistPart = {
  playlistId: string | null;
  title: string | null;
  /** The videos this playlist should hold, in order. */
  videoIds: string[];
  /** How many of videoIds, from the start, are known to be in the playlist in the right place. */
  addedCount: number;
  /** Set when the playlist has to be read back and reordered, not just appended to. Survives an interrupted save. */
  needsReorder?: boolean;
};

export type PartsPlan = { parts: PlaylistPart[]; dropped: PlaylistPart[] };

/**
 * Splits the target order into playlists of up to 5,000, reusing existing playlists in order.
 * A playlist whose old contents are still a prefix of its new contents only needs appending.
 * Anything else, such as another channel's videos landing in the middle, is marked for reordering.
 */
export function partsForTarget(existing: readonly PlaylistPart[], target: readonly string[]): PartsPlan {
  const chunks: string[][] = [];
  for (let start = 0; start < target.length; start += MAX_PLAYLIST_SIZE) chunks.push(target.slice(start, start + MAX_PLAYLIST_SIZE));

  const parts = chunks.map((videoIds, index): PlaylistPart => {
    const previous = existing[index];
    if (!previous?.playlistId) return { playlistId: null, title: null, videoIds, addedCount: 0 };

    const appendOnly = !previous.needsReorder && previous.videoIds.every((videoId, position) => videoIds[position] === videoId);
    if (appendOnly) return { ...previous, videoIds, addedCount: Math.min(previous.addedCount, videoIds.length) };

    return {
      ...previous,
      videoIds,
      addedCount: commonPrefixLength(previous.videoIds.slice(0, previous.addedCount), videoIds),
      needsReorder: true,
    };
  });

  return { parts, dropped: existing.slice(chunks.length).filter((part) => part.playlistId) };
}

export function setTitle(channelTitles: readonly string[], index: number, partCount: number): string {
  const names =
    channelTitles.length > NAMES_SHOWN
      ? `${channelTitles[0]} + ${channelTitles.length - 1} more`
      : channelTitles.join(' + ');
  const suffix = partCount > 1 ? ` · Part ${index + 1}` : '';
  const label = ' · Oldest first';
  const room = MAX_TITLE_LENGTH - label.length - suffix.length;
  const name = names.length > room ? `${names.slice(0, room - 1)}…` : names;
  return `${name}${label}${suffix}`;
}

function commonPrefixLength(a: readonly string[], b: readonly string[]): number {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) length++;
  return length;
}
