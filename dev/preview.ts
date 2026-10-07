// Renders every screen of the extension with mock data, in light and dark, without touching YouTube.
import type { SaveSession } from '../src/playlists/save-session.ts';
import type { SavedSet, SetMember } from '../src/playlists/saved-sets.ts';
import { dialogCss } from '../src/ui/dialog/dialog.css.ts';
import {
  createWorkingView,
  renderAddChannel,
  renderLoading,
  renderMember,
  renderMessage,
  renderSet,
  renderSetup,
  type Content,
  type SetModel,
  type SetupModel,
} from '../src/ui/dialog/views.ts';
import { h, shadowHost } from '../src/ui/dom.ts';
import { createButton, type EntryState } from '../src/ui/entry-button.ts';
import { showToast } from '../src/ui/toast.ts';
import { createBar } from '../src/watching/continue-bar.ts';
import type { Channel } from '../src/youtube/channel.ts';

const AVATAR = 'https://yt3.ggpht.com/ytc/AIdro_nFzZFPLxPZRHcE3SSwzdrbuWqfoWYwLAu0_2iO6blQYAU=s88-c-k-c0x00ffffff-no-rj';
const channel: Channel = { id: 'UCbguawtJlHjxXzdAskubQVg', title: 'William Osman 2', avatarUrl: AVATAR };
const osman: SetMember = { channelId: 'UCfMJ2MchTSW2kWaT0kK94Yw', title: 'William Osman', avatarUrl: null, kinds: ['videos'] };
const osman2: SetMember = { channelId: channel.id, title: channel.title, avatarUrl: AVATAR, kinds: ['videos', 'live'] };
const noop = () => {};

const ids = (prefix: string, length: number) => Array.from({ length }, (_, index) => `${prefix}${index}`);

function savedSet(partSizes: number[], options: { addedInLast?: number; members?: SetMember[] } = {}): SavedSet {
  return {
    setId: 'set-1',
    members: options.members ?? [osman2],
    privacy: 'PRIVATE',
    parts: partSizes.map((size, index) => ({
      playlistId: `PL${index}`,
      title: null,
      videoIds: ids(`p${index}v`, size),
      addedCount: index === partSizes.length - 1 && options.addedInLast !== undefined ? options.addedInLast : size,
    })),
  };
}

const setupActions = { toggleKind: noop, setPrivacy: noop, setDestination: noop, save: noop, close: noop };
const setActions = { watch: noop, update: noop, recheck: noop, openMember: noop, addChannel: noop, close: noop };
const memberActions = { toggleKind: noop, save: noop, askToRemove: noop, cancelRemoval: noop, remove: noop, back: noop, close: noop };
const addActions = { setQuery: noop, find: noop, toggleKind: noop, add: noop, back: noop, close: noop };

const setup = (overrides: Partial<SetupModel>): SetupModel => ({
  channel,
  counts: { videos: 182, shorts: 0, live: 10 },
  kinds: ['videos', 'live'],
  privacy: 'PRIVATE',
  destinations: [],
  destination: null,
  ...overrides,
});
const setModel = (overrides: Partial<SetModel>): SetModel => ({
  set: savedSet([192]),
  lastWatched: 'p0v36',
  newUploads: { state: 'done', count: 0, atLeast: false },
  ...overrides,
});
const session = (overrides: Partial<SaveSession>): SaveSession => ({
  setId: 'set-1',
  channelIds: [channel.id],
  title: channel.title,
  avatarUrl: AVATAR,
  progress: null,
  toScan: null,
  secondsLeft: null,
  ...overrides,
});
const joined = savedSet([1240], { members: [osman, osman2] });

const screens: [string, () => Content[]][] = [
  ['Loading', () => renderLoading(noop)],
  ['Setup, counting', () => renderSetup(setup({ counts: null }), setupActions)],
  ['Setup', () => renderSetup(setup({}), setupActions)],
  [
    'Setup, joining a set',
    () =>
      renderSetup(
        setup({
          destinations: [{ setId: 'set-1', name: 'William Osman', avatars: [null], total: 1048 }],
          destination: 'set-1',
        }),
        setupActions,
      ),
  ],
  [
    'Setup, big channel',
    () => renderSetup(setup({ counts: { videos: 7123, shorts: 412, live: 0 }, kinds: ['videos', 'shorts'], privacy: 'UNLISTED' }), setupActions),
  ],
  ['Collecting', () => createWorkingView(session({ progress: { stage: 'finding', scanned: 100 }, toScan: 192 }), { stop: noop, hide: noop }).nodes],
  ['Checking dates', () => createWorkingView(session({ title: 'William Osman + William Osman 2', progress: { stage: 'dating', done: 640, total: 1240 } }), { stop: noop, hide: noop }).nodes],
  [
    'Adding, two parts',
    () =>
      createWorkingView(
        session({ progress: { stage: 'saving', part: 2, partCount: 2, added: 6200, total: 7535 }, secondsLeft: 140 }),
        { stop: noop, hide: noop },
      ).nodes,
  ],
  ['Ordering', () => createWorkingView(session({ title: 'William Osman + William Osman 2', progress: { stage: 'ordering', done: 120, total: 192 } }), { stop: noop, hide: noop }).nodes],
  ['Set, watching', () => renderSet(setModel({}), setActions)],
  [
    'Joined set, new uploads',
    () => renderSet(setModel({ set: joined, lastWatched: 'p0v411', newUploads: { state: 'done', count: 3, atLeast: false }, banner: { tone: 'success', text: 'Added 192 videos and moved 188 videos into place.' } }), setActions),
  ],
  ['Two parts, checking', () => renderSet(setModel({ set: savedSet([5000, 2535]), lastWatched: 'p1v12', newUploads: { state: 'checking' } }), setActions)],
  [
    'Set, stopped',
    () =>
      renderSet(
        setModel({
          set: savedSet([192], { addedInLast: 120 }),
          lastWatched: null,
          newUploads: { state: 'skipped' },
          banner: { tone: 'error', text: 'Could not reach YouTube. Check your connection. Your progress is kept, so you can resume.' },
        }),
        setActions,
      ),
  ],
  ['Channel in a set', () => renderMember({ set: joined, member: osman2, counts: { videos: 182, shorts: 0, live: 10 }, kinds: ['videos'], confirmingRemoval: false }, memberActions)],
  ['Removing a channel', () => renderMember({ set: joined, member: osman2, counts: null, kinds: ['videos', 'live'], confirmingRemoval: true }, memberActions)],
  ['Add a channel', () => renderAddChannel({ set: savedSet([1048], { members: [osman] }), query: '', search: { state: 'idle' }, counts: null, kinds: ['videos'] }, addActions)],
  [
    'Add a channel, found',
    () =>
      renderAddChannel(
        { set: savedSet([1048], { members: [osman] }), query: '@WilliamOsman2', search: { state: 'found', channel }, counts: { videos: 182, shorts: 0, live: 10 }, kinds: ['videos'] },
        addActions,
      ),
  ],
  [
    'Add a channel, problem',
    () =>
      renderAddChannel(
        { set: savedSet([1048], { members: [osman] }), query: '@nobody', search: { state: 'problem', text: 'No channel found. Check the link or handle and try again.' }, counts: null, kinds: ['videos'] },
        addActions,
      ),
  ],
  [
    'Signed out',
    () =>
      renderMessage(
        { icon: 'account', title: 'Sign in to save playlists', text: 'yt-chronological saves playlists to your YouTube account. Sign in, then try again.' },
        noop,
      ),
  ],
  ['Error', () => renderMessage({ icon: 'error', title: 'Something went wrong', text: 'Could not reach YouTube. Check your connection.', retry: noop }, noop)],
];

const entryStates: [string, EntryState][] = [
  ['Not saved', { kind: 'start' }],
  ['Saving', { kind: 'saving', percent: 62 }],
  ['Collecting', { kind: 'saving', percent: null }],
  ['Not started', { kind: 'continue', started: false, label: '1 of 192', href: '#' }],
  ['Watching', { kind: 'continue', started: true, label: '37 of 192', href: '#' }],
  ['On that video', { kind: 'continue', started: true, label: '37 of 192', href: null }],
  ['Stopped', { kind: 'resume', label: '120 of 192 saved' }],
];

function dialogCard(name: string, content: Content[]): HTMLElement {
  const { host, root } = shadowHost('preview-dialog', `${dialogCss} dialog { position: static; }`);
  const dialog = h('dialog', { open: true }, h('div', { class: 'sheet' }, ...content.filter((node): node is Node => Boolean(node))));
  root.append(dialog);
  return h('figure', { class: 'card' }, h('figcaption', {}, name), host);
}

function column(theme: 'light' | 'dark'): HTMLElement {
  return h(
    'section',
    { class: `column ${theme}` },
    h('h1', {}, theme === 'light' ? 'Light' : 'Dark'),
    h('h2', {}, 'Button next to Subscribe'),
    h(
      'div',
      { class: 'row-list' },
      ...entryStates.map(([name, state]) =>
        h('div', { class: 'entry' }, h('span', { class: 'label' }, name), h('div', { class: 'fake-subscribe' }, 'Subscribe'), createButton(state, name, noop)),
      ),
    ),
    h('h2', {}, 'Continue bar'),
    h('div', { class: 'panel' }, h('strong', {}, 'William Osman 2 · Oldest first'), createBar({ href: '#', label: 'Continue from video 37' }, false)),
    h('div', { class: 'artwork' }, h('div', { class: 'fake-play' }, 'Play all'), createBar({ href: '#', label: 'Continue from video 37' }, true)),
    h('h2', {}, 'Dialog'),
    h('div', { class: 'grid' }, ...screens.map(([name, render]) => dialogCard(name, render()))),
  );
}

document.body.append(
  h(
    'div',
    { class: 'toolbar' },
    h('button', { onClick: () => showToast({ text: 'Saved 192 videos from William Osman 2', action: { label: 'Watch', onClick: noop } }) }, 'Show toast'),
    h(
      'button',
      {
        onClick: () =>
          showToast({ tone: 'error', text: 'Saving William Osman 2 stopped. Could not reach YouTube.', action: { label: 'Details', onClick: noop } }),
      },
      'Show error toast',
    ),
    h('button', { onClick: openModal }, 'Open real modal'),
  ),
  h('main', {}, column('light'), column('dark')),
);

function openModal() {
  const { host, root } = shadowHost('preview-modal', dialogCss);
  const dialog = h('dialog', { closedby: 'any' });
  const close = () => dialog.close();
  dialog.append(h('div', { class: 'sheet' }, ...renderSet(setModel({ set: joined }), { ...setActions, close }).filter((node): node is Node => Boolean(node))));
  dialog.addEventListener('click', (event) => event.target === dialog && close());
  root.append(dialog);
  document.body.append(host);
  dialog.showModal();
}
