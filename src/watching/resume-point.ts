import type { PlaylistPart } from '../playlists/plan-parts.ts';

export type ResumePoint = {
  videoId: string;
  playlistId: string;
  partIndex: number;
  /** 1-based position across every part, for "video 37 of 245". */
  position: number;
};

type Located = { partIndex: number; indexInPart: number; position: number };

export function resumePoint(parts: readonly PlaylistPart[], lastWatchedId: string | null): ResumePoint | null {
  const located = lastWatchedId ? locate(parts, lastWatchedId) : null;
  return (located && pointAt(parts, located)) ?? startOfPart(parts, 0);
}

// Opening a part continues inside it when the last watched video is there, otherwise it starts at its first video.
export function resumePointInPart(
  parts: readonly PlaylistPart[],
  partIndex: number,
  lastWatchedId: string | null,
): ResumePoint | null {
  const located = lastWatchedId ? locate(parts, lastWatchedId) : null;
  return (located?.partIndex === partIndex ? pointAt(parts, located) : null) ?? startOfPart(parts, partIndex);
}

export function nextVideoId(parts: readonly PlaylistPart[], videoId: string): string | null {
  const located = locate(parts, videoId);
  if (!located) return null;
  const part = parts[located.partIndex]!;
  return part.videoIds[located.indexInPart + 1] ?? parts[located.partIndex + 1]?.videoIds[0] ?? null;
}

export function watchUrl(point: ResumePoint): string {
  return `/watch?v=${point.videoId}&list=${point.playlistId}`;
}

function locate(parts: readonly PlaylistPart[], videoId: string): Located | null {
  let before = 0;
  for (const [partIndex, part] of parts.entries()) {
    const indexInPart = part.videoIds.indexOf(videoId);
    if (indexInPart !== -1) return { partIndex, indexInPart, position: before + indexInPart + 1 };
    before += part.videoIds.length;
  }
  return null;
}

function pointAt(parts: readonly PlaylistPart[], { partIndex, indexInPart, position }: Located): ResumePoint | null {
  const part = parts[partIndex]!;
  if (!part.playlistId || indexInPart >= part.addedCount) return null;
  return { videoId: part.videoIds[indexInPart]!, playlistId: part.playlistId, partIndex, position };
}

function startOfPart(parts: readonly PlaylistPart[], partIndex: number): ResumePoint | null {
  const part = parts[partIndex];
  const videoId = part?.videoIds[0];
  if (!part?.playlistId || !videoId) return null;
  const position = parts.slice(0, partIndex).reduce((sum, earlier) => sum + earlier.videoIds.length, 1);
  return { videoId, playlistId: part.playlistId, partIndex, position };
}
