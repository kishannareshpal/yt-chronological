// Regenerates the PNG icons from icons/icon.svg. The PNGs are committed, so building and releasing need no image tools.
import { execFileSync } from 'node:child_process';

for (const size of [16, 32, 48, 128]) {
  execFileSync('rsvg-convert', ['--width', String(size), '--height', String(size), 'icons/icon.svg', '--output', `icons/icon-${size}.png`]);
  console.log(`icons/icon-${size}.png`);
}
