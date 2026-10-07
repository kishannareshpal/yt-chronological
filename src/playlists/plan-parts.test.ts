import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_PLAYLIST_SIZE, partsForTarget, setTitle, type PlaylistPart } from './plan-parts.ts';

const ids = (count: number, prefix = 'v') => Array.from({ length: count }, (_, i) => `${prefix}${i}`);
const part = (videoIds: string[], addedCount = videoIds.length, playlistId: string | null = 'PL1'): PlaylistPart => ({
  playlistId,
  title: 't',
  videoIds,
  addedCount,
});

test('puts a small channel in one new part', () => {
  const { parts } = partsForTarget([], ['a', 'b', 'c']);
  assert.deepEqual(parts, [{ playlistId: null, title: null, videoIds: ['a', 'b', 'c'], addedCount: 0 }]);
});

test('splits at the playlist size limit and keeps order', () => {
  const target = ids(MAX_PLAYLIST_SIZE * 2 + 1);
  const { parts } = partsForTarget([], target);
  assert.deepEqual(parts.map((each) => each.videoIds.length), [MAX_PLAYLIST_SIZE, MAX_PLAYLIST_SIZE, 1]);
  assert.deepEqual(parts.flatMap((each) => each.videoIds), target);
});

test('only appends when new uploads come after the saved ones', () => {
  const { parts } = partsForTarget([part(['a', 'b'], 1)], ['a', 'b', 'c']);
  assert.deepEqual(parts, [{ playlistId: 'PL1', title: 't', videoIds: ['a', 'b', 'c'], addedCount: 1 }]);
});

test('marks a part for reordering when videos land in the middle', () => {
  const { parts } = partsForTarget([part(['a', 'c', 'e'])], ['a', 'b', 'c', 'd', 'e']);
  assert.equal(parts[0]?.needsReorder, true);
  assert.equal(parts[0]?.addedCount, 1);
});

test('keeps a part marked for reordering until it is done', () => {
  const unfinished = { ...part(['a', 'b']), needsReorder: true };
  assert.equal(partsForTarget([unfinished], ['a', 'b', 'c']).parts[0]?.needsReorder, true);
});

test('drops playlists that are no longer needed', () => {
  const { parts, dropped } = partsForTarget([part(['a'], 1, 'PL1'), part(['b'], 1, 'PL2')], ['a']);
  assert.equal(parts.length, 1);
  assert.deepEqual(dropped.map((each) => each.playlistId), ['PL2']);
});

test('names a set after its channels', () => {
  assert.equal(setTitle(['3Blue1Brown'], 0, 1), '3Blue1Brown · Oldest first');
  assert.equal(setTitle(['William Osman', 'William Osman 2'], 1, 3), 'William Osman + William Osman 2 · Oldest first · Part 2');
  assert.equal(setTitle(['A', 'B', 'C', 'D'], 0, 1), 'A + 3 more · Oldest first');
});

test('keeps titles within the YouTube limit', () => {
  const title = setTitle(['x'.repeat(400)], 0, 2);
  assert.equal(title.length, 150);
  assert.ok(title.endsWith(' · Oldest first · Part 1'));
});
