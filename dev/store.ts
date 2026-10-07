// Composes the Chrome Web Store screenshots from the real interface, on a neutral mock of a video site.
// Rendered by scripts/screenshots.mjs, one scene per ?scene= value.
import type { SaveSession } from '../src/playlists/save-session.ts';
import type { SavedSet, SetMember } from '../src/playlists/saved-sets.ts';
import { dialogCss } from '../src/ui/dialog/dialog.css.ts';
import { createWorkingView, renderSet, renderSetup, type Content } from '../src/ui/dialog/views.ts';
import { h, shadowHost } from '../src/ui/dom.ts';
import { createButton } from '../src/ui/entry-button.ts';
import { createBar } from '../src/watching/continue-bar.ts';

const avatar = (initials: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88"><rect width="88" height="88" fill="${color}"/><text x="44" y="56" font-family="Roboto, Arial" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`,
  )}`;

const makerLab: SetMember = { channelId: 'UC0000000000000000000001', title: 'Maker Lab', avatarUrl: avatar('ML', '#c2410c'), kinds: ['videos', 'live'] };
const makerLabToo: SetMember = { channelId: 'UC0000000000000000000002', title: 'Maker Lab Too', avatarUrl: avatar('M2', '#7c3aed'), kinds: ['videos'] };
const noop = () => {};
const ids = (prefix: string, length: number) => Array.from({ length }, (_, index) => `${prefix}${index}`);
const set = (members: SetMember[], size: number): SavedSet => ({
  setId: 'set',
  members,
  privacy: 'PRIVATE',
  parts: [{ playlistId: 'PL1', title: null, videoIds: ids('v', size), addedCount: size }],
});

const VIDEO_TITLES = [
  'Building a workbench from scrap wood',
  'Our very first video',
  'I tried to fix a 1970s radio',
  'Making a lamp out of a bicycle',
  'The garage tour',
  'Welding for absolute beginners',
  'We built a go kart in a weekend',
  'What went wrong with the drone',
];
const HUES = [18, 200, 280, 140, 330, 45, 90, 230];

function thumbnail(index: number, small = false): HTMLElement {
  const hue = HUES[index % HUES.length]!;
  return h(
    'div',
    { class: small ? 'thumb small' : 'thumb', style: `background: linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue + 40} 50% 22%))` },
    h('span', { class: 'duration' }, `${8 + ((index * 7) % 13)}:${String((index * 17) % 60).padStart(2, '0')}`),
  );
}

function card(index: number): HTMLElement {
  return h(
    'div',
    { class: 'card' },
    thumbnail(index),
    h('p', { class: 'card-title' }, VIDEO_TITLES[index % VIDEO_TITLES.length]),
    h('p', { class: 'card-meta' }, `${(index * 37) % 900 + 40}K views · ${(index % 9) + 1} years ago`),
  );
}

function channelHeader(button: HTMLElement): HTMLElement {
  return h(
    'section',
    { class: 'channel' },
    h('div', { class: 'banner' }),
    h(
      'div',
      { class: 'channel-row' },
      h('img', { class: 'channel-avatar', src: makerLab.avatarUrl!, alt: '' }),
      h(
        'div',
        { class: 'channel-info' },
        h('h1', {}, 'Maker Lab'),
        h('p', {}, '@makerlab · 1.2M subscribers · 192 videos'),
        h('div', { class: 'channel-actions' }, h('span', { class: 'subscribe' }, 'Subscribe'), button),
      ),
    ),
    h('div', { class: 'tabs' }, ...['Home', 'Videos', 'Shorts', 'Live', 'Playlists'].map((tab, index) => h('span', { class: index === 1 ? 'active' : '' }, tab))),
    h('div', { class: 'grid' }, ...[0, 2, 3, 4, 5, 6, 7, 1].map(card)),
  );
}

function dialog(content: Content[], { aside = false } = {}): HTMLElement {
  const { host, root } = shadowHost('store-dialog', `${dialogCss} dialog { position: static; margin: 0; }`);
  root.append(h('dialog', { open: true }, h('div', { class: 'sheet' }, ...content.filter((node): node is Node => Boolean(node)))));
  // Set to the side without dimming when the page behind it is part of the story.
  return h('div', { class: aside ? 'overlay aside' : 'overlay' }, host);
}

// Opening the playlist from the library lands on video 1, and the extension offers the way back to video 37.
function watchPage(): HTMLElement {
  const current = 1;
  const panelItems = Array.from({ length: 6 }, (_, offset) =>
    h(
      'div',
      { class: offset === 0 ? 'panel-item current' : 'panel-item' },
      h('span', { class: 'panel-index' }, offset === 0 ? '▶' : String(offset + 1)),
      thumbnail(current + offset, true),
      h('div', {}, h('p', { class: 'panel-title' }, VIDEO_TITLES[(current + offset) % VIDEO_TITLES.length]), h('p', { class: 'card-meta' }, 'Maker Lab')),
    ),
  );
  const hue = HUES[current]!;
  return h(
    'section',
    { class: 'watch' },
    h(
      'div',
      { class: 'watch-main' },
      h(
        'div',
        { class: 'player', style: `background: linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue + 40} 50% 18%))` },
        h('div', { class: 'player-bar' }, h('div', { class: 'player-progress', style: 'width: 4%' })),
      ),
      h('h2', { class: 'watch-title' }, VIDEO_TITLES[current]),
      h(
        'div',
        { class: 'owner' },
        h('img', { class: 'owner-avatar', src: makerLab.avatarUrl!, alt: '' }),
        h('div', {}, h('strong', {}, 'Maker Lab'), h('p', { class: 'card-meta' }, '1.2M subscribers')),
        h('span', { class: 'subscribe' }, 'Subscribe'),
        createButton({ kind: 'continue', started: true, label: '37 of 192', href: '#' }, 'watch', noop),
      ),
    ),
    h(
      'aside',
      { class: 'panel' },
      h('div', { class: 'panel-head' }, h('strong', {}, 'Maker Lab · Oldest first'), h('p', { class: 'card-meta' }, 'Private · 1 / 192'), createBar({ href: '#', label: 'Continue from video 37' }, false)),
      ...panelItems,
    ),
  );
}

type Scene = { headline: string; subline: string; render: () => HTMLElement };

const session = (overrides: Partial<SaveSession>): SaveSession => ({
  setId: 'set',
  channelIds: [makerLab.channelId],
  title: 'Maker Lab',
  avatarUrl: makerLab.avatarUrl,
  progress: null,
  toScan: null,
  secondsLeft: null,
  ...overrides,
});

const SCENES: Record<string, Scene> = {
  1: {
    headline: 'Watch any channel from its very first video',
    subline: 'One click saves every upload into playlists in your account, oldest first.',
    render: () => channelHeader(createButton({ kind: 'continue', started: true, label: '37 of 192', href: '#' }, 'hero', noop)),
  },
  2: {
    headline: 'Choose exactly what to include',
    subline: 'Videos, Shorts and live streams, with counts up front. Big channels split into parts automatically.',
    render: () =>
      h(
        'div',
        { class: 'stack' },
        channelHeader(createButton({ kind: 'start' }, 'setup', noop)),
        dialog(
          renderSetup(
            {
              channel: { id: makerLab.channelId, title: 'Maker Lab', avatarUrl: makerLab.avatarUrl },
              counts: { videos: 182, shorts: 46, live: 10 },
              kinds: ['videos', 'live'],
              privacy: 'PRIVATE',
              destinations: [],
              destination: null,
            },
            { toggleKind: noop, setPrivacy: noop, setDestination: noop, save: noop, close: noop },
          ),
        ),
      ),
  },
  3: {
    headline: 'Pick up exactly where you left off',
    subline: 'Continue from the button next to Subscribe, the playlist page, or right beside the video.',
    render: watchPage,
  },
  4: {
    headline: 'Join channels into one timeline',
    subline: 'Add a second channel and everything is merged by publish date, in your existing playlists.',
    render: () =>
      h(
        'div',
        { class: 'stack' },
        channelHeader(createButton({ kind: 'continue', started: true, label: '412 of 1,240', href: '#' }, 'joined', noop)),
        dialog(
          renderSet(
            {
              set: set([makerLab, makerLabToo], 1240),
              lastWatched: 'v411',
              newUploads: { state: 'done', count: 3, atLeast: false },
              banner: { tone: 'success', text: 'Added 192 videos and moved 188 videos into place.' },
            },
            { watch: noop, update: noop, recheck: noop, openMember: noop, addChannel: noop, close: noop },
          ),
        ),
      ),
  },
  5: {
    headline: 'Keep browsing while it saves',
    subline: 'Close this and carry on watching. Progress stays right next to Subscribe.',
    render: () =>
      h(
        'div',
        { class: 'stack' },
        channelHeader(createButton({ kind: 'saving', percent: 62 }, 'saving', noop)),
        dialog(
          createWorkingView(session({ progress: { stage: 'saving', part: 1, partCount: 1, added: 120, total: 192 }, secondsLeft: 70 }), {
            stop: noop,
            hide: noop,
          }).nodes,
          { aside: true },
        ),
      ),
  },
};

const params = new URLSearchParams(location.search);
const sceneId = params.get('scene') ?? '1';

if (sceneId === 'promo') {
  document.body.classList.add('promo');
  document.body.append(
    h(
      'div',
      { class: 'promo-tile' },
      h('img', { src: '../icons/icon.svg', alt: '' }),
      h('div', {}, h('p', { class: 'promo-name' }, 'yt-chronological'), h('p', { class: 'promo-tagline' }, 'Watch any channel from the start')),
    ),
  );
} else {
  const scene = SCENES[sceneId]!;
  document.body.append(
    h(
      'main',
      { class: 'frame' },
      h('header', { class: 'caption' }, h('h1', {}, scene.headline), h('p', {}, scene.subline)),
      h('div', { class: 'window' }, h('div', { class: 'window-bar' }, h('span'), h('span'), h('span')), h('div', { class: 'page' }, scene.render())),
    ),
  );
}
