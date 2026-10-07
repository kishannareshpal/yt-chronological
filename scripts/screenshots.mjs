// Renders the Chrome Web Store images into store/: five 1280x800 screenshots and the 440x280 promo tile.
// Needs Google Chrome (or CHROME pointing at one) and ImageMagick, because the store rejects images with transparency.
import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const shots = [
  ...['1', '2', '3', '4', '5'].map((scene) => ({ scene, file: `screenshot-${scene}.png`, width: 1280, height: 800 })),
  { scene: 'promo', file: 'promo-small.png', width: 440, height: 280 },
];

await esbuild.build({ entryPoints: ['dev/store.ts'], outdir: 'dev/build', bundle: true, format: 'iife', logLevel: 'warning' });
await mkdir('store', { recursive: true });
const page = pathToFileURL(resolve('dev/store.html'));

for (const { scene, file, width, height } of shots) {
  const raw = resolve('store', `raw-${file}`);
  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    // Leaves time for the web font and the toast's entrance before the capture.
    '--virtual-time-budget=4000',
    `--window-size=${width},${height}`,
    `--screenshot=${raw}`,
    `${page}?scene=${scene}`,
  ], { stdio: 'ignore' });
  execFileSync('magick', [raw, '-background', '#0b0b0b', '-alpha', 'remove', '-alpha', 'off', '-resize', `${width}x${height}!`, resolve('store', file)]);
  await rm(raw);
  console.log(`store/${file}`);
}
