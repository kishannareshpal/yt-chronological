import type { SaveResult } from '../../playlists/save-set.ts';
import { currentSave, startSave, stopSave, type SaveOutcome } from '../../playlists/save-session.ts';
import {
  isComplete,
  listSets,
  loadPreferences,
  loadSet,
  loadSetForChannel,
  newSetId,
  setName,
  setTotals,
  setVideoIds,
  storePreferences,
  type SavedSet,
  type SetMember,
} from '../../playlists/saved-sets.ts';
import { SAVE_SESSION_CHANGED } from '../../shared/events.ts';
import {
  countNewUploads,
  countUploads,
  UPLOAD_KINDS,
  videosToScan,
  type UploadCounts,
  type UploadKind,
} from '../../uploads/fetch-uploads.ts';
import { loadLastWatched } from '../../watching/last-watched.ts';
import { resumePoint, watchUrl } from '../../watching/resume-point.ts';
import { findChannel, findCurrentChannel, type Channel } from '../../youtube/channel.ts';
import { InnertubeError, isSignedIn } from '../../youtube/innertube.ts';
import { count, h, shadowHost } from '../dom.ts';
import { showToast } from '../toast.ts';
import { dialogCss } from './dialog.css.ts';
import {
  createWorkingView,
  renderAddChannel,
  renderLoading,
  renderMember,
  renderMessage,
  renderSet,
  renderSetup,
  type AddChannelModel,
  type Banner,
  type Content,
  type MemberModel,
  type MessageModel,
  type SetModel,
  type SetupModel,
} from './views.ts';

type View =
  | { name: 'loading' }
  | { name: 'message'; model: MessageModel }
  | { name: 'setup'; model: SetupModel }
  | { name: 'set'; model: SetModel }
  | { name: 'member'; model: MemberModel }
  | { name: 'add-channel'; model: AddChannelModel }
  | { name: 'working' };

let dialog: HTMLDialogElement | null = null;
let sheet: HTMLElement | null = null;
let root: ShadowRoot | null = null;
let view: View = { name: 'loading' };
let workingView: ReturnType<typeof createWorkingView> | null = null;
// Each open bumps this, so answers that arrive after the person moved on are ignored.
let generation = 0;
const countsCache = new Map<string, Promise<UploadCounts>>();

document.addEventListener(SAVE_SESSION_CHANGED, () => {
  const session = currentSave();
  if (view.name === 'working' && session) workingView?.update(session);
});

export async function openDialog(): Promise<void> {
  show();
  if (currentSave()) {
    setView({ name: 'working' });
    return;
  }

  const thisOpen = ++generation;
  setView({ name: 'loading' });
  if (!isSignedIn()) {
    setView({
      name: 'message',
      model: {
        icon: 'account',
        title: 'Sign in to save playlists',
        text: 'yt-chronological saves playlists to your YouTube account. Sign in, then try again.',
      },
    });
    return;
  }

  try {
    const channel = await findCurrentChannel();
    if (thisOpen !== generation) return;
    if (!channel) {
      setView({
        name: 'message',
        model: {
          icon: 'sortOldestFirst',
          title: 'Open a channel first',
          text: 'Go to a channel page or one of its videos, then open yt-chronological again.',
        },
      });
      return;
    }
    const set = loadSetForChannel(channel.id);
    if (set) {
      refreshMember(set, channel);
      showSet(set);
    } else {
      showSetup(channel);
    }
  } catch (error) {
    if (thisOpen !== generation) return;
    setView({
      name: 'message',
      model: { icon: 'error', title: 'Something went wrong', text: describeError(error), retry: () => void openDialog() },
    });
  }
}

// Channels saved before avatars were kept, or renamed since, pick up their current look when visited.
function refreshMember(set: SavedSet, channel: Channel) {
  const member = set.members.find((each) => each.channelId === channel.id);
  if (!member || (member.title === channel.title && member.avatarUrl === channel.avatarUrl)) return;
  member.title = channel.title;
  member.avatarUrl = channel.avatarUrl;
}

function showSetup(channel: Channel, banner?: Banner) {
  const preferences = loadPreferences();
  const model: SetupModel = {
    channel,
    counts: null,
    kinds: preferences.kinds,
    privacy: preferences.privacy,
    destinations: listSets().map((set) => ({
      setId: set.setId,
      name: setName(set),
      avatars: set.members.map((member) => member.avatarUrl),
      total: setTotals(set).total,
    })),
    destination: null,
    banner,
  };
  setView({ name: 'setup', model });
  void loadCounts(channel.id, (counts) => {
    if (view.name === 'setup' && view.model === model) {
      model.counts = counts;
      rerender();
    }
  });
}

function showSet(set: SavedSet, banner?: Banner) {
  const model: SetModel = {
    set,
    lastWatched: loadLastWatched(set.setId),
    newUploads: isComplete(set) ? { state: 'checking' } : { state: 'skipped' },
    banner,
  };
  setView({ name: 'set', model });
  if (isComplete(set)) void checkNewUploads(model);
}

async function checkNewUploads(model: SetModel) {
  const thisOpen = generation;
  model.newUploads = { state: 'checking' };
  rerender();
  try {
    const saved = setVideoIds(model.set);
    let total = 0;
    let atLeast = false;
    for (const member of model.set.members) {
      const found = await countNewUploads(member.channelId, member.kinds, saved);
      total += found.count;
      atLeast ||= found.atLeast;
    }
    model.newUploads = { state: 'done', count: total, atLeast };
  } catch {
    model.newUploads = { state: 'failed' };
  }
  if (thisOpen === generation && view.name === 'set' && view.model === model) rerender();
}

function showMember(set: SavedSet, member: SetMember) {
  const model: MemberModel = { set, member, counts: null, kinds: [...member.kinds], confirmingRemoval: false };
  setView({ name: 'member', model });
  void loadCounts(member.channelId, (counts) => {
    if (view.name === 'member' && view.model === model) {
      model.counts = counts;
      rerender();
    }
  });
}

function showAddChannel(set: SavedSet) {
  setView({
    name: 'add-channel',
    model: { set, query: '', search: { state: 'idle' }, counts: null, kinds: loadPreferences().kinds },
  });
  sheet?.querySelector<HTMLElement>('[data-key="query"]')?.focus();
}

async function findChannelToAdd(model: AddChannelModel) {
  const thisOpen = generation;
  model.search = { state: 'finding' };
  model.counts = null;
  rerender();

  let search: AddChannelModel['search'];
  try {
    const channel = await findChannel(model.query);
    const otherSet = channel && loadSetForChannel(channel.id);
    if (!channel) search = { state: 'problem', text: 'No channel found. Check the link or handle and try again.' };
    else if (model.set.members.some((member) => member.channelId === channel.id)) {
      search = { state: 'problem', text: `${channel.title} is already in this set.` };
    } else if (otherSet) {
      search = { state: 'problem', text: `${channel.title} is already saved in "${setName(otherSet)}". Remove it there first.` };
    } else search = { state: 'found', channel };
  } catch (error) {
    search = { state: 'problem', text: describeError(error) };
  }
  if (thisOpen !== generation || view.name !== 'add-channel' || view.model !== model) return;
  model.search = search;
  rerender();

  if (search.state === 'found') {
    void loadCounts(search.channel.id, (counts) => {
      if (view.name === 'add-channel' && view.model === model && model.search === search) {
        model.counts = counts;
        rerender();
      }
    });
  }
}

async function loadCounts(channelId: string, apply: (counts: UploadCounts) => void) {
  let pending = countsCache.get(channelId);
  if (!pending) {
    pending = countUploads(channelId);
    countsCache.set(channelId, pending);
    pending.catch(() => countsCache.delete(channelId));
  }
  try {
    apply(await pending);
  } catch {
    // Counts only make the form nicer. Saving still works without them.
  }
}

async function run(set: SavedSet, toScan: number | null) {
  generation++;
  setView({ name: 'working' });
  const outcome = await startSave(set, toScan);
  const latest = loadSet(set.setId) ?? set;

  if (dialog?.open) {
    showSet(latest, bannerFor(outcome));
    return;
  }
  toastFor(latest, outcome);
}

function bannerFor(outcome: SaveOutcome): Banner | undefined {
  switch (outcome.status) {
    case 'done':
      return { tone: 'success', text: describeResult(outcome.result) };
    case 'stopped':
      return { tone: 'info', text: 'Stopped. Everything done so far is kept, so you can resume any time.' };
    case 'failed':
      return { tone: 'error', text: `${describeError(outcome.error)} Your progress is kept, so you can resume.` };
  }
}

function toastFor(set: SavedSet, outcome: SaveOutcome) {
  const name = setName(set);
  if (outcome.status === 'stopped') return;
  if (outcome.status === 'failed') {
    showToast({
      tone: 'error',
      text: `Saving ${name} stopped. ${describeError(outcome.error)}`,
      action: { label: 'Details', onClick: () => void openDialog() },
    });
    return;
  }
  const point = resumePoint(set.parts, loadLastWatched(set.setId));
  showToast({
    text: `${name}: ${describeResult(outcome.result)}`,
    action: point ? { label: 'Watch', onClick: () => location.assign(watchUrl(point)) } : undefined,
  });
}

function toggled(kinds: readonly UploadKind[], kind: UploadKind, included: boolean): UploadKind[] {
  const next = new Set(kinds);
  if (included) next.add(kind);
  else next.delete(kind);
  return UPLOAD_KINDS.filter((each) => next.has(each));
}

function withoutEmpty(kinds: readonly UploadKind[], counts: UploadCounts | null): UploadKind[] {
  return counts ? kinds.filter((kind) => counts[kind] > 0) : [...kinds];
}

function setupActions(model: SetupModel) {
  return {
    toggleKind(kind: UploadKind, included: boolean) {
      model.kinds = toggled(model.kinds, kind, included);
      rerender();
    },
    setPrivacy(privacy: SetupModel['privacy']) {
      model.privacy = privacy;
      rerender();
    },
    setDestination(setId: string | null) {
      model.destination = setId;
      rerender();
    },
    save() {
      const kinds = withoutEmpty(model.kinds, model.counts);
      storePreferences({ kinds: model.kinds, privacy: model.privacy });
      const member: SetMember = {
        channelId: model.channel.id,
        title: model.channel.title,
        avatarUrl: model.channel.avatarUrl,
        kinds,
      };
      const existing = model.destination ? loadSet(model.destination) : null;
      if (existing) {
        existing.members.push(member);
        void run(existing, null);
        return;
      }
      const set: SavedSet = { setId: newSetId(), members: [member], privacy: model.privacy, parts: [] };
      void run(set, model.counts ? videosToScan(model.counts, kinds) : null);
    },
    close,
  };
}

function setActions(model: SetModel) {
  return {
    watch: (href: string) => location.assign(href),
    update: () => void run(model.set, null),
    recheck: () => void checkNewUploads(model),
    openMember(channelId: string) {
      const member = model.set.members.find((each) => each.channelId === channelId);
      if (member) showMember(model.set, member);
    },
    addChannel: () => showAddChannel(model.set),
    close,
  };
}

function memberActions(model: MemberModel) {
  return {
    toggleKind(kind: UploadKind, included: boolean) {
      model.kinds = toggled(model.kinds, kind, included);
      rerender();
    },
    save() {
      model.member.kinds = withoutEmpty(model.kinds, model.counts);
      void run(model.set, null);
    },
    askToRemove() {
      model.confirmingRemoval = true;
      setView({ name: 'member', model });
    },
    cancelRemoval() {
      model.confirmingRemoval = false;
      setView({ name: 'member', model });
    },
    remove() {
      model.set.members = model.set.members.filter((member) => member !== model.member);
      void run(model.set, null);
    },
    back: () => showSet(model.set),
    close,
  };
}

function addChannelActions(model: AddChannelModel) {
  return {
    setQuery(query: string) {
      model.query = query;
    },
    find: () => void findChannelToAdd(model),
    toggleKind(kind: UploadKind, included: boolean) {
      model.kinds = toggled(model.kinds, kind, included);
      rerender();
    },
    add() {
      if (model.search.state !== 'found') return;
      const { channel } = model.search;
      model.set.members.push({
        channelId: channel.id,
        title: channel.title,
        avatarUrl: channel.avatarUrl,
        kinds: withoutEmpty(model.kinds, model.counts),
      });
      void run(model.set, null);
    },
    back: () => showSet(model.set),
    close,
  };
}

function render(current: View): Content[] {
  workingView = null;
  switch (current.name) {
    case 'loading':
      return renderLoading(close);
    case 'message':
      return renderMessage(current.model, close);
    case 'setup':
      return renderSetup(current.model, setupActions(current.model));
    case 'set':
      return renderSet(current.model, setActions(current.model));
    case 'member':
      return renderMember(current.model, memberActions(current.model));
    case 'add-channel':
      return renderAddChannel(current.model, addChannelActions(current.model));
    case 'working': {
      const session = currentSave();
      if (!session) return renderLoading(close);
      workingView = createWorkingView(session, { stop: stopSave, hide: close });
      return workingView.nodes;
    }
  }
}

function setView(next: View) {
  const viewChanged = next.name !== view.name || next !== view;
  view = next;
  paint(viewChanged);
}

function rerender() {
  paint(false);
}

// Re-rendering replaces the controls, so focus is carried over by each control's data-key.
function paint(viewChanged: boolean) {
  if (!sheet || !root) return;
  const focusedKey = (root.activeElement as HTMLElement | null)?.dataset?.key;
  sheet.replaceChildren(...render(view).filter((node): node is Node => Boolean(node)));

  const sameControl = focusedKey ? sheet.querySelector<HTMLElement>(`[data-key="${focusedKey}"]`) : null;
  if (sameControl) sameControl.focus();
  else if (viewChanged && dialog?.open) sheet.querySelector<HTMLElement>('.btn.primary:not(:disabled)')?.focus();
}

function show() {
  if (!dialog) {
    const created = shadowHost('oldest-first-dialog', dialogCss);
    root = created.root;
    sheet = h('div', { class: 'sheet' });
    dialog = h('dialog', { 'aria-labelledby': 'oldest-first-title', closedby: 'any' }, sheet);
    // Browsers without closedby still close when the backdrop is clicked.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close();
    });
    root.append(dialog);
    document.body.append(created.host);
  }
  if (!dialog.open) dialog.showModal();
}

function close() {
  dialog?.close();
}

function describeResult({ added, removed, moved, skipped }: SaveResult): string {
  const changes = [
    added > 0 && `added ${count(added, 'video')}`,
    removed > 0 && `removed ${count(removed, 'video')}`,
    moved > 0 && `moved ${count(moved, 'video')} into place`,
  ].filter((change): change is string => Boolean(change));

  let text = 'Everything was already up to date.';
  if (changes.length > 0) {
    const sentence = changes.length === 1 ? changes[0]! : `${changes.slice(0, -1).join(', ')} and ${changes.at(-1)}`;
    text = `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
  }
  const refused = skipped > 0 ? ` YouTube would not add ${count(skipped, 'video')}, so they were left out.` : '';
  return text + refused;
}

function describeError(error: unknown): string {
  if (error instanceof InnertubeError && (error.status === 401 || error.status === 403)) {
    return 'YouTube turned the request down. Check that you are signed in.';
  }
  if (error instanceof TypeError) return 'Could not reach YouTube. Check your connection.';
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while talking to YouTube.';
}
