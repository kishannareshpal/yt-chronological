export const dialogCss = `
:host { all: initial; }

dialog {
  box-sizing: border-box;
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 0;
  overflow: auto;
  border: 0;
  border-radius: 16px;
  background: var(--of-surface);
  color: var(--of-text);
  font: 400 14px/20px var(--of-font);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.32);
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 200ms var(--of-ease-out),
    transform 200ms var(--of-ease-out),
    overlay 200ms allow-discrete,
    display 200ms allow-discrete;
}
dialog:not([open]) {
  opacity: 0;
  transform: scale(0.98);
  transition-duration: 120ms;
}
@starting-style {
  dialog[open] { opacity: 0; transform: scale(0.96); }
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0);
  transition: background-color 200ms ease, overlay 200ms allow-discrete, display 200ms allow-discrete;
}
dialog[open]::backdrop { background: rgba(0, 0, 0, 0.5); }
@starting-style {
  dialog[open]::backdrop { background: rgba(0, 0, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  dialog, dialog:not([open]) { transform: none; }
  @starting-style { dialog[open] { transform: none; } }
}

/* Padding lives on an inner wrapper so a click on the dialog element itself always means the backdrop. */
.sheet { padding: 20px 24px 24px; }

.head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.avatar {
  flex: none;
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--of-tonal);
  object-fit: cover;
}
.avatars { display: inline-flex; flex: none; }
.avatars .avatar + .avatar { margin-left: -14px; box-shadow: 0 0 0 2px var(--of-surface); }
.avatars.count-2 .avatar, .avatars.count-3 .avatar { width: 32px; height: 32px; }
.avatars.tiny .avatar { width: 20px; height: 20px; }
.avatars.tiny .avatar + .avatar { margin-left: -8px; }
.head .back { margin-left: -8px; }

.small-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--of-tonal);
  object-fit: cover;
}
.small-avatar.plus svg { width: 18px; height: 18px; fill: currentColor; }

.list { margin: 0; padding: 0; list-style: none; border: 1px solid var(--of-outline); border-radius: 12px; overflow: hidden; }
.list li + li { border-top: 1px solid var(--of-outline); }
.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  padding: 8px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.list-row > svg { flex: none; width: 20px; height: 20px; fill: var(--of-text-secondary); }
.list-row:focus-visible { outline: 2px solid var(--of-accent); outline-offset: -2px; }
.list-text { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.list-title { overflow: hidden; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
.list-meta { color: var(--of-text-secondary); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; }
.list-row.add .list-title { font-weight: 400; }
@media (hover: hover) and (pointer: fine) {
  .list-row:hover { background: var(--of-tonal); }
}

.search { display: flex; gap: 8px; margin-bottom: 16px; }
.field {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--of-outline);
  border-radius: 20px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.field::placeholder { color: var(--of-text-secondary); }
.field:focus-visible { outline: 2px solid var(--of-accent); outline-offset: 1px; border-color: transparent; }
.search .btn { height: 40px; border-radius: 20px; }
.chip { flex: none; padding: 2px 8px; border-radius: 10px; background: var(--of-text); color: var(--of-base); font-size: 12px; font-weight: 500; }
.found-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.titles { flex: 1; min-width: 0; }
.eyebrow { margin: 0; color: var(--of-text-secondary); font-size: 12px; line-height: 16px; }
h2 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.head .btn.icon { margin-right: -8px; }

p { margin: 0; }
.lead { margin-bottom: 20px; color: var(--of-text-secondary); }
.hint { margin-top: 8px; color: var(--of-text-secondary); font-size: 12px; line-height: 16px; }
.note { margin-top: 16px; color: var(--of-text-secondary); font-size: 13px; line-height: 18px; }

.group { margin: 0 0 20px; padding: 0; border: 0; }
.legend { display: block; margin: 0 0 8px; padding: 0; font-weight: 500; }

.rows { border: 1px solid var(--of-outline); border-radius: 12px; overflow: hidden; }
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 14px;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.row + .row { border-top: 1px solid var(--of-outline); }
.row input { width: 18px; height: 18px; margin: 0; accent-color: var(--of-text); cursor: inherit; }
.row input:focus-visible { outline: 2px solid var(--of-accent); outline-offset: 2px; }
.row-label { flex: 1; }
.row-meta { color: var(--of-text-secondary); font-variant-numeric: tabular-nums; }
.row.disabled { cursor: default; color: var(--of-text-secondary); }
@media (hover: hover) and (pointer: fine) {
  .row:not(.disabled):hover { background: var(--of-tonal); }
}

.skeleton {
  display: inline-block;
  width: 28px;
  height: 12px;
  border-radius: 6px;
  background: var(--of-tonal-hover);
  animation: of-pulse 1.2s ease-in-out infinite;
}
.skeleton.wide { width: 160px; height: 16px; vertical-align: middle; }
@keyframes of-pulse { 50% { opacity: 0.4; } }

.segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding: 3px;
  border-radius: 20px;
  background: var(--of-tonal);
}
.segment { position: relative; }
.segment input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
.segment span {
  display: block;
  height: 30px;
  border-radius: 17px;
  font-weight: 500;
  line-height: 30px;
  text-align: center;
  color: var(--of-text-secondary);
  transition: background-color 150ms ease, color 150ms ease;
}
.segment input:checked + span { background: var(--of-text); color: var(--of-base); }
.segment input:focus-visible + span { outline: 2px solid var(--of-accent); outline-offset: 1px; }

.callout {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--of-tonal);
}
.callout svg { flex: none; width: 20px; height: 20px; fill: currentColor; }
.callout .text { flex: 1; }
.callout.success svg { fill: var(--of-success); }
.callout.error svg { fill: var(--of-brand); }

.journey { margin-bottom: 16px; padding: 16px; border-radius: 12px; background: var(--of-tonal); }
.journey-top { display: flex; align-items: baseline; gap: 6px; margin-bottom: 12px; }
.journey-big { font-size: 24px; line-height: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
.journey-of { color: var(--of-text-secondary); font-variant-numeric: tabular-nums; }

.track { position: relative; height: 4px; overflow: hidden; border-radius: 2px; background: var(--of-tonal-hover); }
.fill {
  position: absolute;
  inset: 0;
  background: var(--of-brand);
  transform-origin: left;
  transition: transform 400ms var(--of-ease-out);
}
.track.indeterminate .fill { width: 30%; animation: of-slide 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
@keyframes of-slide { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
@media (prefers-reduced-motion: reduce) {
  .track.indeterminate .fill { width: 100%; animation: of-pulse 1.6s ease-in-out infinite; }
}

.progress-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.stage { font-weight: 500; }
.counter { color: var(--of-text-secondary); font-variant-numeric: tabular-nums; }

.status { display: flex; align-items: center; gap: 10px; min-height: 32px; margin-bottom: 16px; color: var(--of-text-secondary); }
.status svg { flex: none; width: 18px; height: 18px; fill: currentColor; }
.status .text { flex: 1; }
.status.positive svg { fill: var(--of-success); }
.status.attention { color: var(--of-text); }


.message { padding: 8px 0 0; text-align: center; }
.message .badge {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: var(--of-tonal);
}
.message .badge svg { width: 24px; height: 24px; fill: currentColor; }
.message h2 { margin-bottom: 6px; white-space: normal; }
.message p { color: var(--of-text-secondary); }

.actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.actions .spacer { flex: 1; }
.message + .actions { justify-content: center; }
`;
