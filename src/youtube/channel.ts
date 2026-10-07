import { innertube, InnertubeError } from './innertube.ts';

export type Channel = { id: string; title: string; avatarUrl: string | null };

type ChannelMetadata = {
  externalId?: string;
  title?: string;
  vanityChannelUrl?: string;
  channelUrl?: string;
  avatar?: { thumbnails?: { url?: string; width?: number }[] };
};
type ResolveUrlResponse = { endpoint?: { browseEndpoint?: { browseId?: string } } };
type PlayerResponse = { videoDetails?: { videoId?: string; channelId?: string } };
type BrowseResponse = { metadata?: { channelMetadataRenderer?: ChannelMetadata } };
type PlayerElement = HTMLElement & { getPlayerResponse?: () => PlayerResponse | undefined };
type BrowseElement = HTMLElement & { data?: BrowseResponse };

const CHANNEL_PATH = /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/;

export async function findCurrentChannel(): Promise<Channel | null> {
  const id = channelIdOnPage() ?? (await resolveChannelId());
  return id ? channelById(id) : null;
}

/** Finds a channel from what someone pastes: a channel or video link, an @handle, or a channel id. */
export async function findChannel(input: string): Promise<Channel | null> {
  const text = input.trim();
  if (!text) return null;
  if (/^UC[\w-]{22}$/.test(text)) return channelById(text);

  const url = pastedUrl(text);
  if (!url) return null;

  const videoId =
    url.hostname.toLowerCase() === 'youtu.be'
      ? url.pathname.slice(1)
      : url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/shorts\/([^/?]+)/)?.[1];
  if (videoId) {
    const player = await innertube<PlayerResponse>('player', { videoId });
    const id = asChannelId(player.videoDetails?.channelId);
    return id ? channelById(id) : null;
  }

  try {
    const resolved = await innertube<ResolveUrlResponse>('navigation/resolve_url', { url: `https://www.youtube.com${url.pathname}` });
    const id = asChannelId(resolved.endpoint?.browseEndpoint?.browseId);
    return id ? channelById(id) : null;
  } catch (error) {
    // An unknown handle is a missing channel, not a failure.
    if (error instanceof InnertubeError && (error.status === 400 || error.status === 404)) return null;
    throw error;
  }
}

/** Turns "@name", "youtube.com/@name", a full link or a youtu.be link into a URL on youtube.com. */
export function pastedUrl(text: string): URL | null {
  let url: URL;
  try {
    if (/^https?:\/\//i.test(text)) url = new URL(text);
    else if (/^(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(text)) url = new URL(`https://${text}`);
    else url = new URL(`https://www.youtube.com/${text.replace(/^\/+/, '')}`);
  } catch {
    return null;
  }
  return /(^|\.)youtube\.com$|^youtu\.be$/i.test(url.hostname) ? url : null;
}

async function channelById(id: string): Promise<Channel> {
  const metadata = (await innertube<BrowseResponse>('browse', { browseId: id })).metadata?.channelMetadataRenderer;
  return { id, title: metadata?.title ?? 'This channel', avatarUrl: avatarUrl(metadata) };
}

/** Reads the channel from data YouTube already holds for the current page, without a request. */
export function channelIdOnPage(): string | null {
  if (location.pathname === '/watch') {
    const player = document.querySelector<PlayerElement>('#movie_player');
    const details = player?.getPlayerResponse?.()?.videoDetails;
    // Right after navigating, the player still describes the previous video.
    const isCurrent = details?.videoId === new URLSearchParams(location.search).get('v');
    return isCurrent ? asChannelId(details?.channelId) : null;
  }

  if (!CHANNEL_PATH.test(location.pathname)) return null;
  const browse = document.querySelector<BrowseElement>('ytd-browse[page-subtype="channels"]:not([hidden])');
  const metadata = browse?.data?.metadata?.channelMetadataRenderer;
  return metadata && describesCurrentPath(metadata) ? asChannelId(metadata.externalId) : null;
}

async function resolveChannelId(): Promise<string | null> {
  const videoId = currentVideoId();
  if (videoId) {
    const player = await innertube<PlayerResponse>('player', { videoId });
    return asChannelId(player.videoDetails?.channelId);
  }

  if (!CHANNEL_PATH.test(location.pathname)) return null;
  const resolved = await innertube<ResolveUrlResponse>('navigation/resolve_url', { url: location.href });
  return asChannelId(resolved.endpoint?.browseEndpoint?.browseId);
}

// Page data lags behind the URL for a moment when moving between channels.
function describesCurrentPath(metadata: ChannelMetadata): boolean {
  const pagePath = decodeURIComponent(location.pathname).toLowerCase();
  const knownPaths = [metadata.vanityChannelUrl, metadata.channelUrl].flatMap((url) => {
    try {
      return url ? [decodeURIComponent(new URL(url).pathname).toLowerCase()] : [];
    } catch {
      return [];
    }
  });
  const legacyPath = /^\/(c|user)\//.test(pagePath);
  return legacyPath || knownPaths.some((path) => pagePath === path || pagePath.startsWith(`${path}/`));
}

function avatarUrl(metadata: ChannelMetadata | undefined): string | null {
  const thumbnails = metadata?.avatar?.thumbnails ?? [];
  const fitting = thumbnails.find((thumbnail) => (thumbnail.width ?? 0) >= 88) ?? thumbnails.at(-1);
  return fitting?.url ?? null;
}

function currentVideoId(): string | null {
  if (location.pathname === '/watch') return new URLSearchParams(location.search).get('v');
  return location.pathname.match(/^\/shorts\/([^/?]+)/)?.[1] ?? null;
}

function asChannelId(value: string | undefined): string | null {
  return value?.startsWith('UC') ? value : null;
}
