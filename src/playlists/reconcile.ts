/** One entry in a playlist. The same video can appear twice, so entries are identified by setVideoId. */
export type PlaylistItem = { videoId: string; setVideoId: string };

export type Move = { setVideoId: string; afterSetVideoId: string | null };

/** Entries that do not belong in the target, plus repeats of a video already kept. */
export function planRemovals(current: readonly PlaylistItem[], target: readonly string[]): PlaylistItem[] {
  const wanted = new Set(target);
  const kept = new Set<string>();
  return current.filter((item) => {
    if (!wanted.has(item.videoId) || kept.has(item.videoId)) return true;
    kept.add(item.videoId);
    return false;
  });
}

/**
 * The fewest moves that put the entries in target order. Entries on the longest run already in order stay put,
 * and every other entry is moved, left to right, to just after its target predecessor.
 * Target videos that are not in the playlist (YouTube refused them) are ignored.
 */
export function planMoves(current: readonly PlaylistItem[], target: readonly string[]): Move[] {
  const present = new Map(current.map((item) => [item.videoId, item.setVideoId]));
  const order = target.filter((videoId) => present.has(videoId));
  const rank = new Map(order.map((videoId, index) => [videoId, index]));

  const ranks = current.filter((item) => rank.has(item.videoId)).map((item) => rank.get(item.videoId)!);
  const stays = new Set(longestIncreasingSubsequence(ranks));

  const moves: Move[] = [];
  order.forEach((videoId, index) => {
    if (stays.has(index)) return;
    const previous = order[index - 1];
    moves.push({ setVideoId: present.get(videoId)!, afterSetVideoId: previous ? present.get(previous)! : null });
  });
  return moves;
}

/** Returns the values on one longest strictly increasing subsequence, in O(n log n). */
function longestIncreasingSubsequence(values: readonly number[]): number[] {
  const tailIndexes: number[] = [];
  const previous: number[] = new Array(values.length).fill(-1);

  values.forEach((value, index) => {
    let low = 0;
    let high = tailIndexes.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (values[tailIndexes[middle]!]! < value) low = middle + 1;
      else high = middle;
    }
    if (low > 0) previous[index] = tailIndexes[low - 1]!;
    tailIndexes[low] = index;
  });

  const result: number[] = [];
  for (let index = tailIndexes.at(-1) ?? -1; index !== -1; index = previous[index]!) result.push(values[index]!);
  return result.reverse();
}

/** Applies moves the way YouTube does, so plans can be checked in tests. */
export function applyMoves(current: readonly PlaylistItem[], moves: readonly Move[]): PlaylistItem[] {
  const items = [...current];
  for (const move of moves) {
    const from = items.findIndex((item) => item.setVideoId === move.setVideoId);
    const [moved] = items.splice(from, 1);
    const to = move.afterSetVideoId === null ? 0 : items.findIndex((item) => item.setVideoId === move.afterSetVideoId) + 1;
    items.splice(to, 0, moved!);
  }
  return items;
}
