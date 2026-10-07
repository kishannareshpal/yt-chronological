import { loadSet, setIdForPlaylist } from '../playlists/saved-sets.ts';
import { formatNumber, h, shadowHost, svgIcon } from '../ui/dom.ts';
import { ICONS } from '../ui/icons.ts';
import { keepInPage } from '../ui/keep-in-page.ts';
import { LAST_WATCHED_CHANGED } from '../shared/events.ts';
import { loadLastWatched } from './last-watched.ts';
import { resumePoint, watchUrl } from './resume-point.ts';

const TAG = 'oldest-first-continue';

// Under "Play all" on the playlist page, and under the title of the playlist panel beside a video.
const PLAYLIST_PAGE_TARGET = 'ytd-browse[page-subtype="playlist"] yt-flexible-actions-view-model';
const TARGETS = [PLAYLIST_PAGE_TARGET, 'ytd-playlist-panel-renderer #header-contents'].join(', ');

// The shared .btn styles read these tokens, so the overlay variant only swaps them.
const barCss = `
:host { display: block; margin-top: 12px; }
.btn { display: flex; width: 100%; height: 40px; border-radius: 20px; }
.btn svg { width: 24px; height: 24px; }
:host([data-surface="overlay"]) {
  --of-text: var(--of-overlay-text);
  --of-tonal: var(--of-overlay-tonal);
  --of-tonal-hover: var(--of-overlay-tonal-hover);
}
`;

export type Target = { href: string; label: string };

let cache: { key: string; target: Target | null } | null = null;

export function keepContinueBarMounted(): void {
  keepInPage(() => {
    const target = continueTarget();
    for (const container of document.querySelectorAll(TARGETS)) {
      const existing = container.querySelector<HTMLElement>(`:scope > ${TAG}`);
      if (existing?.dataset.href === target?.href) continue;
      existing?.remove();
      // The playlist page header always sits on a dark artwork gradient, whatever the theme.
      if (target) container.append(createBar(target, container.matches(PLAYLIST_PAGE_TARGET)));
    }
  }, [LAST_WATCHED_CHANGED, 'yt-navigate-finish']);
}

function continueTarget(): Target | null {
  const params = new URLSearchParams(location.search);
  const playlistId = params.get('list');
  if (!playlistId) return null;
  const setId = setIdForPlaylist(playlistId);
  if (!setId) return null;

  const lastWatched = loadLastWatched(setId);
  const currentVideoId = location.pathname === '/watch' ? params.get('v') : null;
  // Mutations fire constantly while a video plays, so only re-read the saved channel when something relevant changed.
  const key = [playlistId, lastWatched, currentVideoId].join('|');
  if (cache?.key === key) return cache.target;

  cache = { key, target: buildTarget(setId, playlistId, lastWatched, currentVideoId) };
  return cache.target;
}

function buildTarget(
  setId: string,
  playlistId: string,
  lastWatched: string | null,
  currentVideoId: string | null,
): Target | null {
  if (!lastWatched || lastWatched === currentVideoId) return null;
  const set = loadSet(setId);
  const point = set && resumePoint(set.parts, lastWatched);
  if (!set || point?.videoId !== lastWatched) return null;

  const inOtherPart = point.playlistId !== playlistId ? ` in part ${point.partIndex + 1}` : '';
  return { href: watchUrl(point), label: `Continue from video ${formatNumber(point.position)}${inOtherPart}` };
}

export function createBar(target: Target, onArtwork: boolean): HTMLElement {
  const { host, root } = shadowHost(TAG, barCss);
  host.dataset.href = target.href;
  if (onArtwork) host.dataset.surface = 'overlay';
  root.append(h('a', { class: 'btn with-icon', href: target.href }, svgIcon(ICONS.play), target.label));
  return host;
}
