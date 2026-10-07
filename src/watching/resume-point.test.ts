import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PlaylistPart } from '../playlists/plan-parts.ts';
import { nextVideoId, resumePoint, resumePointInPart } from './resume-point.ts';

const part = (playlistId: string | null, videoIds: string[], addedCount = videoIds.length): PlaylistPart => ({
  playlistId,
  title: null,
  videoIds,
  addedCount,
});

const parts = [part('PL1', ['a', 'b', 'c']), part('PL2', ['d', 'e'])];

test('starts at the first video when nothing was watched', () => {
  assert.deepEqual(resumePoint(parts, null), { videoId: 'a', playlistId: 'PL1', partIndex: 0, position: 1 });
});

test('continues at the last watched video, across parts', () => {
  assert.deepEqual(resumePoint(parts, 'e'), { videoId: 'e', playlistId: 'PL2', partIndex: 1, position: 5 });
});

test('starts over when the last watched video is not in the set', () => {
  assert.equal(resumePoint(parts, 'zzz')?.videoId, 'a');
});

test('does not send you to a video that has not been added yet', () => {
  const partial = [part('PL1', ['a', 'b', 'c'], 1)];
  assert.equal(resumePoint(partial, 'c')?.videoId, 'a');
});

test('has nowhere to go before the first playlist exists', () => {
  assert.equal(resumePoint([part(null, ['a'], 0)], null), null);
});

test('opening a part continues inside it only when progress is there', () => {
  assert.equal(resumePointInPart(parts, 0, 'b')?.videoId, 'b');
  assert.deepEqual(resumePointInPart(parts, 1, 'b'), { videoId: 'd', playlistId: 'PL2', partIndex: 1, position: 4 });
});

test('the next video crosses into the next part', () => {
  assert.equal(nextVideoId(parts, 'a'), 'b');
  assert.equal(nextVideoId(parts, 'c'), 'd');
  assert.equal(nextVideoId(parts, 'e'), null);
});
