import { innertube } from '../youtube/innertube.ts';

const CACHE_KEY = 'oldest-first:publish-dates';
// Four at a time is quick (about 30 videos a second) without YouTube starting to leave answers empty.
const CONCURRENCY = 4;

type PlayerResponse = { microformat?: { playerMicroformatRenderer?: { publishDate?: string; uploadDate?: string } } };

/** Publish times in seconds, from the cache or looked up one video at a time. Unknown videos sort last. */
export async function publishTimes(
  videoIds: readonly string[],
  { onProgress, signal }: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<(videoId: string) => number> {
  const cache = loadCache();
  const missing = [...new Set(videoIds)].filter((videoId) => cache[videoId] === undefined);
  let done = 0;
  onProgress?.(done, missing.length);

  const queue = [...missing];
  const worker = async () => {
    for (let videoId = queue.shift(); videoId; videoId = queue.shift()) {
      const time = await lookUp(videoId, signal);
      if (time !== null) cache[videoId] = time;
      onProgress?.(++done, missing.length);
      // Saving as it goes means an interrupted save does not look the same videos up again.
      if (done % 200 === 0) storeCache(cache);
    }
  };
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    storeCache(cache);
  }

  return (videoId) => cache[videoId] ?? Infinity;
}

async function lookUp(videoId: string, signal?: AbortSignal): Promise<number | null> {
  const player = await innertube<PlayerResponse>('player', { videoId }, signal);
  const details = player.microformat?.playerMicroformatRenderer;
  const date = details?.publishDate ?? details?.uploadDate;
  const time = date ? Date.parse(date) : NaN;
  return Number.isNaN(time) ? null : Math.floor(time / 1000);
}

function loadCache(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function storeCache(cache: Record<string, number>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Without the cache, dates are looked up again next time. Slower, but still correct.
  }
}
