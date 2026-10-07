import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestVersion, nextVersion, parseRemoteTags } from './release-version.mjs';

const day = new Date(2026, 7, 22, 15);

test('numbers releases within a day', () => {
  assert.equal(nextVersion(day, []), '2026.08.22.1');
  assert.equal(nextVersion(day, ['2026.08.22.1']), '2026.08.22.2');
  assert.equal(nextVersion(day, ['2026.08.22.9', '2026.08.22.10']), '2026.08.22.11');
});

test('ignores other days and other tags', () => {
  assert.equal(nextVersion(day, ['2026.08.21.4', '2026.08.22.2']), '2026.08.22.3');
  assert.equal(nextVersion(day, ['v2026.08.22.1', 'v0.1.0']), '2026.08.22.1');
});

test('reads tags from ls-remote output', () => {
  const output = 'abc\trefs/tags/2026.08.22.1\ndef\trefs/tags/2026.08.22.1^{}\nghi\trefs/tags/v0.1.0\njkl\trefs/tags/2026.08.21.3\n';
  assert.deepEqual(parseRemoteTags(output).sort(), ['2026.08.21.3', '2026.08.22.1']);
});

test('turns tags into versions browsers accept', () => {
  assert.equal(manifestVersion('2026.10.07.1'), '2026.10.7.1');
  assert.equal(manifestVersion('v0.1.0'), '0.1.0');
  assert.throws(() => manifestVersion('2026.10.07.1-beta'));
  assert.throws(() => manifestVersion('1.2.3.4.5'));
});
