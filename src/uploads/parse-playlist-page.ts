export type PlaylistPage = {
  videoIds: string[];
  /** Entries with their setVideoId, present only when the signed-in owner reads their own playlist. */
  items: { videoId: string; setVideoId: string }[];
  continuation: string | null;
};

type Node = Record<string, unknown>;

// YouTube reshuffles renderer nesting often, so walk the whole response for the two leaf shapes we rely on.
export function parsePlaylistPage(response: unknown): PlaylistPage {
  const videoIds: string[] = [];
  const items: PlaylistPage['items'] = [];
  let continuation: string | null = null;

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = value as Node;

    const videoId = lockupVideoId(node) ?? shortsLockupVideoId(node);
    if (videoId) videoIds.push(videoId);

    // Owners see their own playlists through the older, editable renderer.
    const editable = node.playlistVideoRenderer as { videoId?: unknown; setVideoId?: unknown } | undefined;
    if (typeof editable?.videoId === 'string') {
      videoIds.push(editable.videoId);
      if (typeof editable.setVideoId === 'string') items.push({ videoId: editable.videoId, setVideoId: editable.setVideoId });
    }

    const token = (node.continuationCommand as Node | undefined)?.token;
    if (typeof token === 'string') continuation ??= token;

    Object.values(node).forEach(visit);
  };

  visit(response);
  return { videoIds, items, continuation };
}

type PlaylistHeader = { header?: { playlistHeaderRenderer?: { numVideosText?: { runs?: { text?: string }[] } } } };

// The header reads like "1,234 videos" in the page language, so keep only the digits.
export function parsePlaylistVideoCount(response: unknown): number {
  const text = (response as PlaylistHeader).header?.playlistHeaderRenderer?.numVideosText?.runs?.[0]?.text ?? '';
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function lockupVideoId(node: Node): string | null {
  const lockup = node.lockupViewModel as Node | undefined;
  if (lockup?.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
  return typeof lockup.contentId === 'string' ? lockup.contentId : null;
}

function shortsLockupVideoId(node: Node): string | null {
  const lockup = node.shortsLockupViewModel as
    | { onTap?: { innertubeCommand?: { reelWatchEndpoint?: { videoId?: unknown } } } }
    | undefined;
  const videoId = lockup?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
  return typeof videoId === 'string' ? videoId : null;
}
