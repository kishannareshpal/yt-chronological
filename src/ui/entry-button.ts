import { currentSave } from '../playlists/save-session.ts';
import { isComplete, loadSetForChannel, setTotals } from '../playlists/saved-sets.ts';
import type { SaveProgress } from '../playlists/save-set.ts';
import { LAST_WATCHED_CHANGED, SAVE_SESSION_CHANGED, SAVED_SETS_CHANGED } from '../shared/events.ts';
import { loadLastWatched } from '../watching/last-watched.ts';
import { resumePoint, watchUrl } from '../watching/resume-point.ts';
import { channelIdOnPage } from '../youtube/channel.ts';
import { formatNumber, h, shadowHost, svgIcon } from './dom.ts';
import { ICONS } from './icons.ts';
import { keepInPage } from './keep-in-page.ts';

const TAG = 'oldest-first-button';

// Selectors for the rows holding the Subscribe button. YouTube runs layout experiments per account,
// so several shapes are covered. If all of them miss, the toolbar button still opens the dialog.
const TARGETS = [
  'ytd-browse[page-subtype="channels"] yt-flexible-actions-view-model',
  'ytd-browse[page-subtype="channels"] #inner-header-container #buttons',
  'ytd-watch-metadata #owner',
].join(', ');

export type EntryState =
  | { kind: 'start' }
  | { kind: 'saving'; percent: number | null }
  | { kind: 'resume'; label: string }
  | { kind: 'continue'; started: boolean; label: string; href: string | null };

const buttonCss = `
:host { display: inline-flex; margin-left: 8px; vertical-align: middle; }
.group { display: inline-flex; align-items: center; }
.group .btn { font-size: 14px; }
.split .main { border-radius: 18px 0 0 18px; padding-right: 12px; }
.split .more { width: 36px; padding: 0; border-radius: 0 18px 18px 0; }
.split .more::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--of-outline);
}
.more { position: relative; }
.counter { font-variant-numeric: tabular-nums; color: var(--of-text-secondary); }
.ring { width: 18px; height: 18px; flex: none; }
.ring circle { fill: none; stroke-width: 3; }
.ring .bg { stroke: var(--of-tonal-hover); }
.ring .value { stroke: var(--of-brand); stroke-linecap: round; transition: stroke-dashoffset 400ms var(--of-ease-out); }
`;

export function keepEntryButtonsMounted(openDialog: () => void): void {
  keepInPage(
    () => {
      const state = entryState();
      const stateKey = JSON.stringify(state);
      // YouTube keeps earlier pages alive but hidden, so every match is filled, not just the first.
      for (const container of document.querySelectorAll(TARGETS)) {
        if (container.querySelector(TARGETS)) continue;
        const existing = container.querySelector<HTMLElement>(`:scope > ${TAG}`);
        if (existing?.dataset.state === stateKey) continue;
        existing?.remove();
        container.append(createButton(state, stateKey, openDialog));
      }
    },
    [SAVE_SESSION_CHANGED, SAVED_SETS_CHANGED, LAST_WATCHED_CHANGED, 'yt-navigate-finish'],
  );
}

function entryState(): EntryState {
  const channelId = channelIdOnPage();
  const session = currentSave();
  if (session && (!channelId || session.channelIds.includes(channelId))) {
    return { kind: 'saving', percent: percentDone(session.progress) };
  }

  const set = channelId ? loadSetForChannel(channelId) : null;
  if (!set) return { kind: 'start' };

  const { total, added } = setTotals(set);
  const lastWatched = loadLastWatched(set.setId);
  const point = resumePoint(set.parts, lastWatched);
  const started = point?.videoId === lastWatched;
  // Before anyone has watched, a half-saved set is better resumed than started.
  if (!point || (!isComplete(set) && !started)) {
    return { kind: 'resume', label: `${formatNumber(added)} of ${formatNumber(total)} saved` };
  }

  const onThatVideo = new URLSearchParams(location.search).get('v') === point.videoId;
  return {
    kind: 'continue',
    started,
    label: `${formatNumber(point.position)} of ${formatNumber(total)}`,
    href: onThatVideo ? null : watchUrl(point),
  };
}

function percentDone(progress: SaveProgress | null): number | null {
  if (!progress) return null;
  if (progress.stage === 'saving') return Math.floor((progress.added / Math.max(progress.total, 1)) * 100);
  if (progress.stage === 'dating' || progress.stage === 'ordering') return Math.floor((progress.done / Math.max(progress.total, 1)) * 100);
  return null;
}

export function createButton(state: EntryState, stateKey: string, openDialog: () => void): HTMLElement {
  const { host, root } = shadowHost(TAG, buttonCss);
  host.dataset.state = stateKey;
  root.append(h('div', { class: state.kind === 'continue' && state.href ? 'group split' : 'group' }, ...buttonContent(state, openDialog)));
  return host;
}

function buttonContent(state: EntryState, openDialog: () => void): Node[] {
  const button = (props: Record<string, unknown>, ...children: (Node | string)[]) =>
    h('button', { type: 'button', class: 'btn with-icon', onClick: openDialog, ...props }, ...children);

  switch (state.kind) {
    case 'start':
      return [
        button({ title: 'Save this channel as playlists, oldest first' }, svgIcon(ICONS.sortOldestFirst), 'Oldest first'),
      ];
    case 'saving':
      return [
        button(
          { title: 'Saving this channel. Click to see progress.' },
          state.percent === null ? h('span', { class: 'spinner' }) : progressRing(state.percent),
          'Saving',
          state.percent === null ? '' : h('span', { class: 'counter' }, `${state.percent}%`),
        ),
      ];
    case 'resume':
      return [
        button({ title: 'Saving stopped before it finished. Click to resume.' }, svgIcon(ICONS.pause), 'Oldest first', h('span', { class: 'counter' }, state.label)),
      ];
    case 'continue': {
      if (!state.href) {
        // Already on the video you would continue from, so the only useful action is the options.
        return [button({ title: 'Oldest first options' }, svgIcon(ICONS.sortOldestFirst), 'Oldest first', h('span', { class: 'counter' }, state.label))];
      }
      const main = state.started
        ? [svgIcon(ICONS.play), 'Continue', h('span', { class: 'counter' }, state.label)]
        : [svgIcon(ICONS.play), 'Watch from the start'];
      return [
        h(
          'a',
          { class: 'btn with-icon main', href: state.href, title: state.started ? `Continue from video ${state.label}` : 'Watch this channel from its first upload' },
          ...main,
        ),
        h(
          'button',
          { type: 'button', class: 'btn more', 'aria-label': 'Oldest first options', title: 'Oldest first options', onClick: openDialog },
          svgIcon(ICONS.chevronDown),
        ),
      ];
    }
  }
}

function progressRing(percent: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 18 18');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('aria-hidden', 'true');
  for (const [className, offset] of [['bg', 0], ['value', circumference * (1 - percent / 100)]] as const) {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '9');
    circle.setAttribute('cy', '9');
    circle.setAttribute('r', String(radius));
    circle.setAttribute('class', className);
    circle.setAttribute('stroke-dasharray', String(circumference));
    circle.setAttribute('stroke-dashoffset', String(offset));
    circle.setAttribute('transform', 'rotate(-90 9 9)');
    svg.append(circle);
  }
  return svg;
}
