/**
 * Merges several channels' uploads, each already oldest first, into one list ordered by publish time.
 * Each channel's own order is always kept, and ties go to the channel listed first.
 */
export function mergeByPublishTime(lists: readonly (readonly string[])[], publishedAt: (videoId: string) => number): string[] {
  const positions = lists.map(() => 0);
  const merged: string[] = [];
  const seen = new Set<string>();

  for (;;) {
    let pick = -1;
    let pickTime = Infinity;
    lists.forEach((list, listIndex) => {
      const videoId = list[positions[listIndex]!];
      if (videoId === undefined) return;
      const time = publishedAt(videoId);
      if (pick === -1 || time < pickTime) {
        pick = listIndex;
        pickTime = time;
      }
    });
    if (pick === -1) return merged;

    const videoId = lists[pick]![positions[pick]!]!;
    positions[pick]!++;
    // A collaboration can appear on two channels, but belongs in the playlist once.
    if (!seen.has(videoId)) {
      seen.add(videoId);
      merged.push(videoId);
    }
  }
}
