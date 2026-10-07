import { controlsCss, themeTokens } from './theme.ts';

type Child = Node | string | false | null | undefined;
type Props = Record<string, unknown>;

// YouTube enforces Trusted Types, so markup is built node by node instead of through innerHTML.
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      element.className = String(value);
    } else if (key in element) {
      (element as unknown as Props)[key] = value;
    } else {
      element.setAttribute(key, String(value));
    }
  }
  element.append(...children.filter((child): child is Node | string => Boolean(child)));
  return element;
}

export function svgIcon(pathData: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', pathData);
  svg.append(path);
  return svg;
}

export function shadowHost(tagName: string, css: string): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement(tagName);
  const root = host.attachShadow({ mode: 'open' });
  root.append(h('style', { textContent: themeTokens + controlsCss + css }));
  return { host, root };
}

const numberFormat = new Intl.NumberFormat();

export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${numberFormat.format(value)} ${value === 1 ? singular : plural}`;
}

export const formatNumber = numberFormat.format;

export function formatTimeLeft(seconds: number): string {
  if (seconds < 60) return 'Less than a minute left';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${count(minutes, 'minute')} left`;
  return `About ${count(Math.round(minutes / 60), 'hour')} left`;
}
