declare global {
  interface Window {
    ytcfg?: { get(key: string): unknown };
  }
}

type InnertubeContext = { client?: { visitorData?: string } };

export class InnertubeError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

const AUTH_SCHEMES = [
  ['SAPISIDHASH', 'SAPISID'],
  ['SAPISID1PHASH', '__Secure-1PAPISID'],
  ['SAPISID3PHASH', '__Secure-3PAPISID'],
] as const;

function config<T>(key: string): T | undefined {
  return window.ytcfg?.get(key) as T | undefined;
}

export function isSignedIn(): boolean {
  return config<boolean>('LOGGED_IN') === true;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export async function innertube<T>(
  endpoint: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: await requestHeaders(),
      body: JSON.stringify({ context: config('INNERTUBE_CONTEXT'), ...body }),
      signal,
    });
    if (response.ok) return (await response.json()) as T;

    if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
      throw new InnertubeError(`YouTube answered with status ${response.status}.`, response.status);
    }
    await sleep(2 ** attempt * 1000 + Math.random() * 1000, signal);
  }
}

async function requestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': location.origin,
    'X-Goog-AuthUser': String(config('SESSION_INDEX') ?? 0),
    'X-Youtube-Client-Name': String(config('INNERTUBE_CONTEXT_CLIENT_NAME') ?? 1),
    'X-Youtube-Client-Version': String(config('INNERTUBE_CLIENT_VERSION') ?? ''),
  };

  const visitorData = config<InnertubeContext>('INNERTUBE_CONTEXT')?.client?.visitorData;
  if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;

  // Brand accounts act through a delegated session; without it writes land on the personal account.
  const delegatedSessionId = config<string>('DELEGATED_SESSION_ID');
  if (delegatedSessionId) headers['X-Goog-PageId'] = delegatedSessionId;

  const authorization = await authorizationHeader();
  if (authorization) headers.Authorization = authorization;

  return headers;
}

async function authorizationHeader(): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const parts = await Promise.all(
    AUTH_SCHEMES.map(async ([scheme, cookieName]) => {
      const secret = readCookie(cookieName);
      if (!secret) return null;
      const hash = await sha1Hex(`${timestamp} ${secret} ${location.origin}`);
      return `${scheme} ${timestamp}_${hash}`;
    }),
  );
  return parts.filter(Boolean).join(' ');
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
