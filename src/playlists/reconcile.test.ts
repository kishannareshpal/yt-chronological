import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMoves, planMoves, planRemovals, type PlaylistItem } from './reconcile.ts';

const items = (videoIds: string[]): PlaylistItem[] => videoIds.map((videoId, index) => ({ videoId, setVideoId: `s${index}${videoId}` }));
const order = (list: PlaylistItem[]) => list.map((item) => item.videoId);

test('removes videos that left the target and repeated entries', () => {
  const removed = planRemovals(items(['a', 'x', 'b', 'a']), ['a', 'b']);
  assert.deepEqual(order(removed), ['x', 'a']);
  assert.equal(removed[1]?.setVideoId, 's3a');
});

test('moves nothing when already in order', () => {
  assert.deepEqual(planMoves(items(['a', 'b', 'c']), ['a', 'b', 'c']), []);
});

test('slots appended videos into place with one move each', () => {
  // Channel B's videos were appended and belong between channel A's.
  const current = items(['a1', 'a2', 'a3', 'b1', 'b2']);
  const target = ['a1', 'b1', 'a2', 'b2', 'a3'];
  const moves = planMoves(current, target);
  assert.equal(moves.length, 2);
  assert.deepEqual(order(applyMoves(current, moves)), target);
});

test('moves to the top when the first video changes', () => {
  const current = items(['b', 'c', 'a']);
  const moves = planMoves(current, ['a', 'b', 'c']);
  assert.deepEqual(moves, [{ setVideoId: 's2a', afterSetVideoId: null }]);
  assert.deepEqual(order(applyMoves(current, moves)), ['a', 'b', 'c']);
});

test('reaches any target order', () => {
  const target = Array.from({ length: 60 }, (_, index) => `v${index}`);
  for (let seed = 1; seed <= 25; seed++) {
    let state = seed;
    const random = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const shuffled = [...target].sort(() => random() - 0.5);
    const current = items(shuffled);
    assert.deepEqual(order(applyMoves(current, planMoves(current, target))), target);
  }
});

test('skips target videos that are missing from the playlist', () => {
  const current = items(['c', 'a']);
  assert.deepEqual(order(applyMoves(current, planMoves(current, ['a', 'refused', 'c']))), ['a', 'c']);
});
