import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePlaylistPage, parsePlaylistVideoCount } from './parse-playlist-page.ts';

const lockup = (contentId: string, contentType = 'LOCKUP_CONTENT_TYPE_VIDEO') => ({
  lockupViewModel: { contentId, contentType },
});
const short = (videoId: string) => ({
  shortsLockupViewModel: { onTap: { innertubeCommand: { reelWatchEndpoint: { videoId } } } },
});

test('finds videos and Shorts in order, wherever they are nested', () => {
  const page = { contents: [{ a: [lockup('v1'), { b: short('s1') }] }, lockup('v2')] };
  assert.deepEqual(parsePlaylistPage(page).videoIds, ['v1', 's1', 'v2']);
});

test('ignores lockups that are not videos', () => {
  assert.deepEqual(parsePlaylistPage([lockup('PL1', 'LOCKUP_CONTENT_TYPE_PLAYLIST')]).videoIds, []);
});

test('takes the first continuation token', () => {
  const page = { x: { continuationCommand: { token: 'first' } }, y: { continuationCommand: { token: 'second' } } };
  assert.equal(parsePlaylistPage(page).continuation, 'first');
  assert.equal(parsePlaylistPage({}).continuation, null);
});

test('reads the video count whatever the number formatting', () => {
  const header = (text: string) => ({ header: { playlistHeaderRenderer: { numVideosText: { runs: [{ text }] } } } });
  assert.equal(parsePlaylistVideoCount(header('152')), 152);
  assert.equal(parsePlaylistVideoCount(header('7,123')), 7123);
  assert.equal(parsePlaylistVideoCount(header('7.123')), 7123);
  assert.equal(parsePlaylistVideoCount({ alerts: [] }), 0);
});

test('reads entries with their setVideoId from the owner view', () => {
  const page = { contents: [{ playlistVideoRenderer: { videoId: 'v1', setVideoId: 'S1', menu: { setVideoId: 'S1' } } }] };
  const parsed = parsePlaylistPage(page);
  assert.deepEqual(parsed.videoIds, ['v1']);
  assert.deepEqual(parsed.items, [{ videoId: 'v1', setVideoId: 'S1' }]);
});
