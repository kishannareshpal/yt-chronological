import { h, shadowHost, svgIcon } from './dom.ts';
import { ICONS } from './icons.ts';

export type ToastOptions = {
  text: string;
  tone?: 'default' | 'error';
  action?: { label: string; onClick: () => void };
};

const VISIBLE_MS = 8000;

// Mirrors YouTube's own snackbar: bottom left, in inverted colours so it stands out from the page in either theme.
const toastCss = `
:host { all: initial; }
.toast {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 2300;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  max-width: min(480px, calc(100vw - 48px));
  min-height: 48px;
  padding: 6px 6px 6px 16px;
  border-radius: 12px;
  background: var(--of-text);
  color: var(--of-base);
  font: 400 14px/20px var(--of-font);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms var(--of-ease-out), transform 200ms var(--of-ease-out);
}
@starting-style { .toast { opacity: 0; transform: translateY(12px); } }
.toast.leaving { opacity: 0; transform: translateY(6px); transition-duration: 140ms; }
.toast .icon { flex: none; width: 20px; height: 20px; fill: #ff4e45; }
.toast .text { flex: 1; }
.toast .btn { background: transparent; color: inherit; }
@media (hover: hover) and (pointer: fine) {
  .toast .btn:hover:not(:disabled) { background: color-mix(in srgb, currentColor 12%, transparent); }
}
.toast .btn.action { font-weight: 700; }
@media (prefers-reduced-motion: reduce) {
  .toast, .toast.leaving { transform: none; }
  @starting-style { .toast { transform: none; } }
}
@media (max-width: 520px) { .toast { left: 12px; right: 12px; bottom: 12px; max-width: none; } }
`;

let dismissCurrent: (() => void) | null = null;

export function showToast({ text, tone = 'default', action }: ToastOptions): void {
  dismissCurrent?.();

  const { host, root } = shadowHost('oldest-first-toast', toastCss);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // A toast that times out while the tab is in the background was never seen.
  const onVisibilityChange = () => (document.hidden ? clearTimeout(timer) : startTimer());

  const dismiss = () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (dismissCurrent === dismiss) dismissCurrent = null;
    toast.classList.add('leaving');
    setTimeout(() => host.remove(), 160);
  };
  const startTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(dismiss, VISIBLE_MS);
  };

  const icon = tone === 'error' ? svgIcon(ICONS.error) : null;
  icon?.setAttribute('class', 'icon');

  const toast = h(
    'div',
    { class: 'toast', role: tone === 'error' ? 'alert' : 'status' },
    icon,
    h('span', { class: 'text' }, text),
    action &&
      h(
        'button',
        {
          type: 'button',
          class: 'btn action',
          onClick: () => {
            dismiss();
            action.onClick();
          },
        },
        action.label,
      ),
    h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Dismiss', onClick: dismiss }, svgIcon(ICONS.close)),
  );

  // Reading or reaching for the toast should not make it vanish.
  toast.addEventListener('pointerenter', () => clearTimeout(timer));
  toast.addEventListener('pointerleave', startTimer);
  toast.addEventListener('focusin', () => clearTimeout(timer));
  toast.addEventListener('focusout', startTimer);

  document.addEventListener('visibilitychange', onVisibilityChange);

  root.append(toast);
  document.body.append(host);
  dismissCurrent = dismiss;
  if (!document.hidden) startTimer();
}
