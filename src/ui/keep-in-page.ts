// YouTube rebuilds its pages on client-side navigation, so injected UI is re-synced after DOM changes, throttled.
// A timer rather than requestAnimationFrame, which never fires while the tab is in the background.
export function keepInPage(sync: () => void, extraTriggers: string[] = []): void {
  let scheduled = false;
  const run = () => {
    scheduled = false;
    sync();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(run, 150);
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  for (const eventName of extraTriggers) document.addEventListener(eventName, schedule);
  run();
}
