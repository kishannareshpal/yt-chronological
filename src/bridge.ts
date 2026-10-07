import { OPEN_DIALOG } from './shared/events.ts';

// The main-world script owns the UI but cannot receive extension messages, so this isolated script relays them.
chrome.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: unknown } | null)?.type !== OPEN_DIALOG) return;
  document.dispatchEvent(new CustomEvent(OPEN_DIALOG));
});
