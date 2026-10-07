const CALVER_TAG = /^\d{4}\.\d{2}\.\d{2}\.\d+$/;

/** The next CalVer tag, YYYY.MM.DD.n, where n counts releases made on the same day. */
export function nextVersion(now, tags) {
  const pad = (value) => String(value).padStart(2, '0');
  const prefix = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  let highest = 0;
  for (const tag of tags) {
    if (!CALVER_TAG.test(tag) || !tag.startsWith(`${prefix}.`)) continue;
    highest = Math.max(highest, Number(tag.slice(prefix.length + 1)));
  }
  return `${prefix}.${highest + 1}`;
}

/** CalVer tags from `git ls-remote --tags` output, ignoring peeled refs and any other tags. */
export function parseRemoteTags(lsRemote) {
  const tags = new Set();
  for (const line of lsRemote.split('\n')) {
    const ref = line.split('refs/tags/')[1];
    if (!ref) continue;
    const tag = ref.replace(/\^\{\}$/, '');
    if (CALVER_TAG.test(tag)) tags.add(tag);
  }
  return [...tags];
}

/**
 * Browsers want up to four dot-separated integers without leading zeros, so 2026.10.07.1 becomes 2026.10.7.1.
 * A leading "v" is dropped too.
 */
export function manifestVersion(version) {
  const parts = version.replace(/^v/, '').split('.');
  if (parts.length > 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 65535)) {
    throw new Error(`"${version}" is not a valid extension version. Use up to four dot-separated numbers.`);
  }
  return parts.map(Number).join('.');
}
