// YouTube renamed its theme variables from --yt-spec-* to --yt-sys-color-baseline--*. Both are tried, newest first,
// so injected UI follows the light and dark themes on either version.
export const themeTokens = `
:host {
  --of-text: var(--yt-sys-color-baseline--text-primary, var(--yt-spec-text-primary, #0f0f0f));
  --of-text-secondary: var(--yt-sys-color-baseline--text-secondary, var(--yt-spec-text-secondary, #606060));
  --of-base: var(--yt-sys-color-baseline--base-background, var(--yt-spec-base-background, #fff));
  --of-surface: var(--yt-sys-color-baseline--menu-background, var(--yt-spec-menu-background, #fff));
  --of-tonal: var(--yt-sys-color-baseline--tonal-background, var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05)));
  --of-tonal-hover: var(--yt-sys-color-baseline--mono-tonal-hover, var(--yt-spec-button-chip-background-hover, rgba(0, 0, 0, 0.1)));
  --of-primary-hover: var(--yt-sys-color-baseline--mono-filled-hover, #272727);
  --of-outline: var(--yt-sys-color-baseline--outline, var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.1)));
  --of-accent: var(--yt-sys-color-baseline--call-to-action, var(--yt-spec-call-to-action, #065fd4));
  --of-brand: var(--yt-sys-color-baseline--static-brand-red, #f03);
  --of-success: #2ba640;
  --of-overlay-text: var(--yt-sys-color-baseline--overlay-text-primary, #fff);
  --of-overlay-tonal: var(--yt-sys-color-baseline--overlay-tonal-background, rgba(255, 255, 255, 0.3));
  --of-overlay-tonal-hover: var(--yt-sys-color-baseline--overlay-tonal-hover, rgba(255, 255, 255, 0.2));
  --of-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --of-font: Roboto, Arial, sans-serif;
}
`;

export const controlsCss = `
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 18px;
  background: var(--of-tonal);
  color: var(--of-text);
  font: 500 14px/20px var(--of-font);
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 150ms ease, transform 160ms var(--of-ease-out), opacity 150ms ease;
}
.btn svg { flex: none; width: 20px; height: 20px; fill: currentColor; }
.btn.with-icon { padding-left: 12px; }
.btn.primary { background: var(--of-text); color: var(--of-base); }
.btn.quiet { background: transparent; }
.btn.small { height: 32px; padding: 0 12px; font-size: 13px; }
.btn.icon { width: 36px; padding: 0; }
.btn:disabled { opacity: 0.4; cursor: default; }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:focus-visible { outline: 2px solid var(--of-accent); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) {
  .btn:hover:not(:disabled) { background: var(--of-tonal-hover); }
  .btn.primary:hover:not(:disabled) { background: var(--of-primary-hover); }
  .btn.quiet:hover:not(:disabled) { background: var(--of-tonal); }
}
@media (prefers-reduced-motion: reduce) {
  .btn:active:not(:disabled) { transform: none; }
}

.spinner {
  flex: none;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  opacity: 0.7;
  animation: of-spin 700ms linear infinite;
}
@keyframes of-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 1.6s; } }
`;
