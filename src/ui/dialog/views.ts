import { MAX_PLAYLIST_SIZE } from '../../playlists/plan-parts.ts';
import type { SaveSession } from '../../playlists/save-session.ts';
import { isComplete, setName, setTotals, type SavedSet, type SetMember } from '../../playlists/saved-sets.ts';
import type { Privacy } from '../../playlists/youtube-playlists.ts';
import { totalUploads, UPLOAD_KINDS, type UploadCounts, type UploadKind } from '../../uploads/fetch-uploads.ts';
import { resumePoint, resumePointInPart, watchUrl, type ResumePoint } from '../../watching/resume-point.ts';
import type { Channel } from '../../youtube/channel.ts';
import { count, formatNumber, formatTimeLeft, h, svgIcon } from '../dom.ts';
import { ICONS } from '../icons.ts';

export type Content = Node | null | false;
export type Banner = { tone: 'success' | 'info' | 'error'; text: string };
type Identity = { title: string; avatars: (string | null)[] };

export type SetSummary = { setId: string; name: string; avatars: (string | null)[]; total: number };

export type SetupModel = {
  channel: Channel;
  counts: UploadCounts | null;
  kinds: UploadKind[];
  privacy: Privacy;
  /** Existing sets this channel could join. */
  destinations: SetSummary[];
  /** null means a new set of its own. */
  destination: string | null;
  banner?: Banner;
};
export type SetupActions = {
  toggleKind(kind: UploadKind, included: boolean): void;
  setPrivacy(privacy: Privacy): void;
  setDestination(setId: string | null): void;
  save(): void;
  close(): void;
};

export type NewUploadsState =
  | { state: 'checking' }
  | { state: 'failed' }
  | { state: 'skipped' }
  | { state: 'done'; count: number; atLeast: boolean };

export type SetModel = { set: SavedSet; lastWatched: string | null; newUploads: NewUploadsState; banner?: Banner };
export type SetActions = {
  watch(href: string): void;
  update(): void;
  recheck(): void;
  openMember(channelId: string): void;
  addChannel(): void;
  close(): void;
};

export type MemberModel = {
  set: SavedSet;
  member: SetMember;
  counts: UploadCounts | null;
  kinds: UploadKind[];
  confirmingRemoval: boolean;
};
export type MemberActions = {
  toggleKind(kind: UploadKind, included: boolean): void;
  save(): void;
  askToRemove(): void;
  cancelRemoval(): void;
  remove(): void;
  back(): void;
  close(): void;
};

export type AddChannelModel = {
  set: SavedSet;
  query: string;
  search: { state: 'idle' } | { state: 'finding' } | { state: 'problem'; text: string } | { state: 'found'; channel: Channel };
  counts: UploadCounts | null;
  kinds: UploadKind[];
};
export type AddChannelActions = {
  setQuery(query: string): void;
  find(): void;
  toggleKind(kind: UploadKind, included: boolean): void;
  add(): void;
  back(): void;
  close(): void;
};

export type MessageModel = { title: string; text: string; icon: keyof typeof ICONS; retry?: () => void };

const KIND_LABELS: Record<UploadKind, string> = { videos: 'Videos', shorts: 'Shorts', live: 'Live streams' };
const PRIVACY_OPTIONS: { value: Privacy; label: string; hint: string }[] = [
  { value: 'PRIVATE', label: 'Private', hint: 'Only you can see these playlists.' },
  { value: 'UNLISTED', label: 'Unlisted', hint: 'Anyone with the link can watch them.' },
  { value: 'PUBLIC', label: 'Public', hint: 'Anyone can find and watch them.' },
];

export function renderLoading(close: () => void): Content[] {
  return [
    h(
      'header',
      { class: 'head' },
      h('div', { class: 'avatar', 'aria-hidden': 'true' }),
      h(
        'div',
        { class: 'titles' },
        h('p', { class: 'eyebrow' }, 'Oldest first'),
        h('h2', { id: 'oldest-first-title' }, h('span', { class: 'skeleton wide', 'aria-label': 'Loading channel' })),
      ),
      closeButton(close),
    ),
    h('p', { class: 'status' }, h('span', { class: 'spinner' }), h('span', { class: 'text' }, 'Looking up this channel')),
  ];
}

export function renderMessage(model: MessageModel, close: () => void): Content[] {
  return [
    h(
      'div',
      { class: 'message' },
      h('div', { class: 'badge' }, svgIcon(ICONS[model.icon])),
      h('h2', { id: 'oldest-first-title' }, model.title),
      h('p', {}, model.text),
    ),
    actions(
      button(model.retry ? 'Close' : 'Got it', close, { variant: model.retry ? '' : 'primary', key: 'close' }),
      model.retry && button('Try again', model.retry, { variant: 'primary', key: 'retry' }),
    ),
  ];
}

export function renderSetup(model: SetupModel, act: SetupActions): Content[] {
  const { channel, counts, kinds, privacy, destination } = model;
  const joining = destination !== null;
  const selectedTotal = counts ? totalUploads(counts, kinds) : null;
  const parts = !joining && selectedTotal ? Math.ceil(selectedTotal / MAX_PLAYLIST_SIZE) : 0;
  const privacyHint = PRIVACY_OPTIONS.find((option) => option.value === privacy)?.hint ?? '';
  const verb = joining ? 'Add' : 'Save';

  let saveLabel = joining ? 'Add to set' : 'Save playlists';
  if (selectedTotal === 0) saveLabel = 'Nothing to save';
  else if (selectedTotal !== null) saveLabel = `${verb} ${count(selectedTotal, 'video')}`;

  return [
    head({ title: channel.title, avatars: [channel.avatarUrl] }, 'Oldest first', act.close),
    bannerElement(model.banner),
    h(
      'p',
      { class: 'lead' },
      joining
        ? 'Its uploads are merged in by publish date, so the playlists stay in order from the very first video.'
        : 'Saves every upload to playlists in your account, from the first video to the latest.',
    ),
    model.destinations.length > 0 &&
      h(
        'fieldset',
        { class: 'group' },
        h('legend', { class: 'legend' }, 'Save to'),
        h(
          'div',
          { class: 'rows' },
          destinationRow(null, 'Its own playlists', 'New', null, destination === null, act),
          ...model.destinations.map((option) =>
            destinationRow(option.setId, option.name, count(option.total, 'video'), option.avatars, destination === option.setId, act),
          ),
        ),
      ),
    kindsGroup(counts, kinds, act.toggleKind),
    !joining &&
      h(
        'div',
        { class: 'group' },
        h('p', { class: 'legend', id: 'oldest-first-visibility' }, 'Visibility'),
        h(
          'div',
          { class: 'segmented', role: 'radiogroup', 'aria-labelledby': 'oldest-first-visibility' },
          ...PRIVACY_OPTIONS.map((option) =>
            h(
              'label',
              { class: 'segment' },
              h('input', {
                type: 'radio',
                name: 'oldest-first-privacy',
                value: option.value,
                checked: option.value === privacy,
                'data-key': `privacy-${option.value}`,
                onChange: () => act.setPrivacy(option.value),
              }),
              h('span', {}, option.label),
            ),
          ),
        ),
        h('p', { class: 'hint' }, privacyHint),
      ),
    parts > 1 &&
      h(
        'p',
        { class: 'hint' },
        `That is more than one playlist can hold, so it will be split into ${parts} parts of up to ${formatNumber(MAX_PLAYLIST_SIZE)} videos.`,
      ),
    actions(
      button('Cancel', act.close, { key: 'cancel' }),
      button(saveLabel, act.save, { variant: 'primary', key: 'save', disabled: kinds.length === 0 || selectedTotal === 0 }),
    ),
  ];
}

export function renderSet(model: SetModel, act: SetActions): Content[] {
  const { set, lastWatched } = model;
  const { total, added } = setTotals(set);
  const complete = isComplete(set);
  const createdParts = set.parts.filter((part) => part.playlistId);
  const point = resumePoint(set.parts, lastWatched);
  const started = point !== null && point.videoId === lastWatched;

  const journey = h(
    'section',
    { class: 'journey', 'aria-label': 'Where you are' },
    h(
      'div',
      { class: 'journey-top' },
      h('span', { class: 'journey-big' }, started ? `Video ${formatNumber(point.position)}` : formatNumber(total)),
      h('span', { class: 'journey-of' }, started ? `of ${formatNumber(total)}` : total === 1 ? 'video' : 'videos'),
    ),
    track(started ? point.position / Math.max(total, 1) : 0),
    h('p', { class: 'hint' }, count(createdParts.length, 'playlist')),
  );

  return [
    head({ title: setName(set), avatars: set.members.map((member) => member.avatarUrl) }, 'Oldest first', act.close),
    bannerElement(model.banner),
    journey,
    complete
      ? newUploadsStatus(model.newUploads, act)
      : status('attention', svgIcon(ICONS.pause), `Saving stopped at ${formatNumber(added)} of ${formatNumber(total)}`),
    h(
      'section',
      { class: 'group' },
      h('p', { class: 'legend' }, set.members.length > 1 ? 'Channels' : 'Channel'),
      h(
        'ul',
        { class: 'list' },
        ...set.members.map((member) =>
          h(
            'li',
            {},
            h(
              'button',
              { type: 'button', class: 'list-row', 'data-key': `member-${member.channelId}`, onClick: () => act.openMember(member.channelId) },
              smallAvatar(member.avatarUrl),
              h('span', { class: 'list-text' }, h('span', { class: 'list-title' }, member.title), h('span', { class: 'list-meta' }, kindsSummary(member.kinds))),
              svgIcon(ICONS.chevronRight),
            ),
          ),
        ),
        h(
          'li',
          {},
          h(
            'button',
            { type: 'button', class: 'list-row add', 'data-key': 'add-channel', onClick: act.addChannel },
            h('span', { class: 'small-avatar plus' }, svgIcon(ICONS.add)),
            h('span', { class: 'list-text' }, h('span', { class: 'list-title' }, 'Add a channel')),
          ),
        ),
      ),
    ),
    createdParts.length > 1 &&
      h(
        'section',
        { class: 'group' },
        h('p', { class: 'legend' }, 'Parts'),
        h(
          'ul',
          { class: 'list' },
          ...createdParts.map((part, index) => {
            const partPoint = resumePointInPart(set.parts, index, lastWatched);
            const here = started && point.partIndex === index;
            return h(
              'li',
              {},
              h(
                'a',
                { class: 'list-row', href: partPoint ? watchUrl(partPoint) : `/playlist?list=${part.playlistId}`, 'data-key': `part-${index}` },
                h('span', { class: 'list-text' }, h('span', { class: 'list-title' }, `Part ${index + 1}`)),
                here && h('span', { class: 'chip' }, 'You are here'),
                h('span', { class: 'list-meta' }, count(part.videoIds.length, 'video')),
              ),
            );
          }),
        ),
      ),
    complete
      ? actions(h('span', { class: 'spacer' }), point && watchButton(point, started, 'primary', act))
      : actions(point && watchButton(point, started, '', act), button('Resume saving', act.update, { variant: 'primary', key: 'update' })),
  ];
}

export function renderMember(model: MemberModel, act: MemberActions): Content[] {
  const { set, member, counts, kinds } = model;
  const changed = kinds.join() !== member.kinds.join();
  const canRemove = set.members.length > 1;

  if (model.confirmingRemoval) {
    return [
      head({ title: member.title, avatars: [member.avatarUrl] }, setName(set), act.close, act.cancelRemoval),
      callout('error', `Remove ${member.title} from this set? Its videos come out of the playlists. The other channels stay as they are.`),
      actions(
        button('Cancel', act.cancelRemoval, { key: 'cancel-remove' }),
        button('Remove channel', act.remove, { variant: 'primary', key: 'remove' }),
      ),
    ];
  }

  return [
    head({ title: member.title, avatars: [member.avatarUrl] }, setName(set), act.close, act.back),
    kindsGroup(counts, kinds, act.toggleKind),
    changed && h('p', { class: 'hint' }, 'Saving updates the playlists and keeps everything in order.'),
    actions(
      canRemove && button('Remove from set', act.askToRemove, { variant: 'quiet', key: 'ask-remove' }),
      h('span', { class: 'spacer' }),
      button('Save changes', act.save, { variant: 'primary', key: 'save', disabled: !changed || kinds.length === 0 }),
    ),
  ];
}

export function renderAddChannel(model: AddChannelModel, act: AddChannelActions): Content[] {
  const { set, search, counts, kinds } = model;
  const found = search.state === 'found' ? search.channel : null;
  const selectedTotal = counts ? totalUploads(counts, kinds) : null;

  let addLabel = 'Add to set';
  if (found && selectedTotal === 0) addLabel = 'Nothing to add';
  else if (found && selectedTotal !== null) addLabel = `Add ${count(selectedTotal, 'video')}`;

  const input = h('input', {
    type: 'text',
    class: 'field',
    value: model.query,
    placeholder: 'Channel link or @handle',
    'aria-label': 'Channel link or @handle',
    autocomplete: 'off',
    spellcheck: false,
    'data-key': 'query',
    onInput: (event: Event) => act.setQuery((event.target as HTMLInputElement).value),
  });

  return [
    head({ title: setName(set), avatars: set.members.map((member) => member.avatarUrl) }, 'Add a channel', act.close, act.back),
    h('p', { class: 'lead' }, 'Paste a channel link, a video link or an @handle. Its uploads are merged in by publish date.'),
    h(
      'form',
      {
        class: 'search',
        onSubmit: (event: Event) => {
          event.preventDefault();
          act.find();
        },
      },
      input,
      h('button', { type: 'submit', class: 'btn', 'data-key': 'find', disabled: search.state === 'finding' }, 'Find'),
    ),
    search.state === 'finding' && status('', h('span', { class: 'spinner' }), 'Looking for the channel'),
    search.state === 'problem' && status('attention', svgIcon(ICONS.error), search.text),
    found &&
      h(
        'div',
        { class: 'found' },
        h('div', { class: 'found-head' }, smallAvatar(found.avatarUrl), h('span', { class: 'list-title' }, found.title)),
        kindsGroup(counts, kinds, act.toggleKind),
      ),
    actions(button(addLabel, act.add, { variant: 'primary', key: 'add', disabled: !found || kinds.length === 0 || selectedTotal === 0 })),
  ];
}

export type WorkingActions = { stop(): void; hide(): void };

/** Built once and updated in place, so the progress bar animates instead of being replaced on every batch. */
export function createWorkingView(session: SaveSession, act: WorkingActions) {
  const stage = h('span', { class: 'stage' });
  const counter = h('span', { class: 'counter' });
  const fill = h('div', { class: 'fill' });
  const bar = h('div', { class: 'track', role: 'progressbar', 'aria-label': 'Saving progress' }, fill);
  const hint = h('p', { class: 'hint', role: 'status' });

  const update = ({ progress, toScan, secondsLeft }: SaveSession) => {
    let fraction: number | null = null;
    const of = (done: number, total: number) => `${formatNumber(Math.min(done, total))} of ${formatNumber(total)}`;

    switch (progress?.stage) {
      case undefined:
        stage.textContent = 'Getting ready';
        counter.textContent = '';
        hint.textContent = 'Reading the channel.';
        break;
      case 'finding':
        stage.textContent = 'Collecting uploads';
        counter.textContent = toScan ? of(progress.scanned, toScan) : `${formatNumber(progress.scanned)} found`;
        fraction = toScan ? progress.scanned / toScan : null;
        hint.textContent = 'Putting them in order from the first upload.';
        break;
      case 'dating':
        stage.textContent = 'Checking publish dates';
        counter.textContent = of(progress.done, progress.total);
        fraction = progress.done / Math.max(progress.total, 1);
        hint.textContent = 'Needed to merge channels in the right order. Remembered for next time.';
        break;
      case 'checking':
        stage.textContent = 'Reading your playlists';
        counter.textContent = '';
        hint.textContent = 'Working out what needs to change.';
        break;
      case 'saving':
        stage.textContent =
          progress.partCount > 1 ? `Adding to part ${progress.part} of ${progress.partCount}` : 'Adding to your playlist';
        counter.textContent = of(progress.added, progress.total);
        fraction = progress.added / Math.max(progress.total, 1);
        hint.textContent = secondsLeft === null ? 'Working out how long this takes.' : formatTimeLeft(secondsLeft);
        break;
      case 'ordering':
        stage.textContent = 'Putting videos in order';
        counter.textContent = of(progress.done, progress.total);
        fraction = progress.done / Math.max(progress.total, 1);
        hint.textContent = 'Moving each video into its place by date.';
        break;
    }

    bar.classList.toggle('indeterminate', fraction === null);
    fill.style.transform = fraction === null ? '' : `scaleX(${Math.min(fraction, 1)})`;
    if (fraction === null) bar.removeAttribute('aria-valuenow');
    else bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
  };
  update(session);

  const nodes: Content[] = [
    head({ title: session.title, avatars: [session.avatarUrl] }, 'Saving', act.hide),
    h('div', { class: 'progress-head' }, stage, counter),
    bar,
    hint,
    h('p', { class: 'note' }, 'You can close this and keep browsing. Keep this tab open until it finishes.'),
    actions(
      button('Stop', act.stop, { variant: 'quiet', key: 'stop' }),
      h('span', { class: 'spacer' }),
      button('Keep browsing', act.hide, { variant: 'primary', key: 'hide' }),
    ),
  ];
  return { nodes, update };
}

function kindsGroup(counts: UploadCounts | null, kinds: UploadKind[], onToggle: (kind: UploadKind, included: boolean) => void) {
  return h(
    'fieldset',
    { class: 'group' },
    h('legend', { class: 'legend' }, 'Include'),
    h(
      'div',
      { class: 'rows' },
      ...UPLOAD_KINDS.map((kind) => {
        const available = counts ? counts[kind] : null;
        const empty = available === 0;
        return h(
          'label',
          { class: empty ? 'row disabled' : 'row' },
          h('input', {
            type: 'checkbox',
            checked: kinds.includes(kind) && !empty,
            disabled: empty,
            'data-key': `kind-${kind}`,
            onChange: (event: Event) => onToggle(kind, (event.target as HTMLInputElement).checked),
          }),
          h('span', { class: 'row-label' }, KIND_LABELS[kind]),
          available === null
            ? h('span', { class: 'skeleton', 'aria-label': 'Counting' })
            : h('span', { class: 'row-meta' }, empty ? 'None' : formatNumber(available)),
        );
      }),
    ),
  );
}

function destinationRow(
  setId: string | null,
  name: string,
  meta: string,
  avatars: (string | null)[] | null,
  checked: boolean,
  act: SetupActions,
) {
  return h(
    'label',
    { class: 'row' },
    h('input', {
      type: 'radio',
      name: 'oldest-first-destination',
      checked,
      'data-key': `destination-${setId ?? 'new'}`,
      onChange: () => act.setDestination(setId),
    }),
    avatars && avatarStack(avatars, 'tiny'),
    h('span', { class: 'row-label' }, name),
    h('span', { class: 'row-meta' }, meta),
  );
}

function newUploadsStatus(state: NewUploadsState, act: SetActions): Content {
  switch (state.state) {
    case 'skipped':
      return null;
    case 'checking':
      return status('', h('span', { class: 'spinner' }), 'Checking for new uploads');
    case 'failed':
      return status('', svgIcon(ICONS.error), 'Could not check for new uploads', button('Retry', act.recheck, { variant: 'quiet', size: 'small', key: 'recheck' }));
    case 'done':
      if (state.count === 0) return status('positive', svgIcon(ICONS.check), 'Up to date');
      return status(
        'attention',
        svgIcon(ICONS.newReleases),
        `${formatNumber(state.count)}${state.atLeast ? '+' : ''} new ${state.count === 1 && !state.atLeast ? 'upload' : 'uploads'}`,
        button('Add to playlist', act.update, { size: 'small', key: 'update' }),
      );
  }
}

function watchButton(point: ResumePoint, started: boolean, variant: string, act: SetActions): HTMLButtonElement {
  return button(started ? 'Continue watching' : 'Start watching', () => act.watch(watchUrl(point)), {
    variant,
    key: 'watch',
    icon: ICONS.play,
  });
}

function status(tone: string, icon: Node, text: string, action?: Node): HTMLElement {
  return h('div', { class: `status ${tone}`.trim() }, icon, h('span', { class: 'text' }, text), action);
}

function head(identity: Identity, eyebrow: string, close: () => void, back?: () => void): HTMLElement {
  return h(
    'header',
    { class: 'head' },
    back && button('', back, { variant: 'quiet icon back', icon: ICONS.arrowBack, label: 'Back', key: 'back-arrow' }),
    avatarStack(identity.avatars, 'large'),
    h('div', { class: 'titles' }, h('p', { class: 'eyebrow' }, eyebrow), h('h2', { id: 'oldest-first-title' }, identity.title)),
    closeButton(close),
  );
}

function avatarStack(avatars: (string | null)[], size: 'large' | 'tiny'): HTMLElement {
  const shown = avatars.slice(0, 3);
  return h(
    'span',
    { class: `avatars ${size} count-${shown.length}`, 'aria-hidden': 'true' },
    ...shown.map((url) => (url ? h('img', { class: 'avatar', src: url, alt: '', referrerPolicy: 'no-referrer' }) : h('span', { class: 'avatar' }))),
  );
}

function smallAvatar(url: string | null): HTMLElement {
  return url
    ? h('img', { class: 'small-avatar', src: url, alt: '', referrerPolicy: 'no-referrer' })
    : h('span', { class: 'small-avatar', 'aria-hidden': 'true' });
}

function closeButton(close: () => void) {
  return button('', close, { variant: 'quiet icon', icon: ICONS.close, label: 'Close', key: 'close-x' });
}

function track(fraction: number): HTMLElement {
  return h('div', { class: 'track', 'aria-hidden': 'true' }, h('div', { class: 'fill', style: `transform: scaleX(${fraction})` }));
}

function bannerElement(banner?: Banner): Content {
  return banner ? callout(banner.tone, banner.text) : null;
}

function callout(tone: Banner['tone'], text: string): HTMLElement {
  const icon = tone === 'success' ? ICONS.check : tone === 'error' ? ICONS.error : null;
  return h('div', { class: `callout ${tone}`, role: 'status' }, icon && svgIcon(icon), h('span', { class: 'text' }, text));
}

function actions(...children: (Node | null | false | undefined)[]): HTMLElement {
  return h('footer', { class: 'actions' }, ...children);
}

type ButtonOptions = { variant?: string; size?: 'small'; icon?: string; label?: string; key?: string; disabled?: boolean };

function button(text: string, onClick: () => void, options: ButtonOptions = {}): HTMLButtonElement {
  const classes = ['btn', options.variant, options.size, options.icon && text ? 'with-icon' : ''].filter(Boolean).join(' ');
  return h(
    'button',
    { type: 'button', class: classes, onClick, disabled: options.disabled, 'aria-label': options.label, 'data-key': options.key },
    options.icon && svgIcon(options.icon),
    text,
  );
}

export function kindsSummary(kinds: readonly UploadKind[]): string {
  const labels = kinds.map((kind) => KIND_LABELS[kind].toLowerCase());
  const joined = labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
