import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeByPublishTime } from './merge-uploads.ts';

const times: Record<string, number> = { a1: 1, a2: 5, a3: 9, b1: 3, b2: 5, b3: 20 };
const at = (videoId: string) => times[videoId] ?? Infinity;

test('interleaves channels by publish time', () => {
  assert.deepEqual(mergeByPublishTime([['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']], at), ['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
});

test('keeps a single channel as it is', () => {
  assert.deepEqual(mergeByPublishTime([['a3', 'a1']], at), ['a3', 'a1']);
});

test('lists a video shared by two channels once', () => {
  assert.deepEqual(mergeByPublishTime([['a1', 'a2'], ['b1', 'a2']], at), ['a1', 'b1', 'a2']);
});

test('puts videos without a known date last, in channel order', () => {
  assert.deepEqual(mergeByPublishTime([['a1', 'unknown'], ['b3']], at), ['a1', 'b3', 'unknown']);
});
