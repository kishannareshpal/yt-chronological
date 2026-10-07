import { OPEN_DIALOG } from './shared/events.ts';

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: OPEN_DIALOG });
  } catch {
    // The tab is not a YouTube page, or was opened before the extension loaded.
  }
});
