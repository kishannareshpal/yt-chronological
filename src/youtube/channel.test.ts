import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pastedUrl } from './channel.ts';

test('understands the ways people paste a channel', () => {
  assert.equal(pastedUrl('@WilliamOsman2')?.href, 'https://www.youtube.com/@WilliamOsman2');
  assert.equal(pastedUrl('youtube.com/@3blue1brown/videos')?.pathname, '/@3blue1brown/videos');
  assert.equal(pastedUrl('https://m.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw')?.pathname, '/channel/UCYO_jab_esuFRV4b17AJtAw');
  assert.equal(pastedUrl('https://youtu.be/aircAruvnKk')?.hostname, 'youtu.be');
});

test('refuses links to other sites', () => {
  assert.equal(pastedUrl('https://vimeo.com/123'), null);
});
