import * as esbuild from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { manifestVersion } from './release-version.mjs';

const watch = process.argv.includes('--watch');
const version = manifestVersion(JSON.parse(await readFile('package.json', 'utf8')).version);

const youtube = ['https://www.youtube.com/*'];

const baseManifest = {
  manifest_version: 3,
  name: 'Oldest First for YouTube',
  version,
  description:
    'Save every upload from a YouTube channel into playlists that play from the first video to the latest.',
  action: { default_title: 'Save this channel oldest first' },
  content_scripts: [
    { matches: youtube, js: ['main-world.js'], world: 'MAIN', run_at: 'document_idle' },
    { matches: youtube, js: ['bridge.js'], run_at: 'document_idle' },
  ],
};

const manifests = {
  chrome: {
    ...baseManifest,
    minimum_chrome_version: '111',
    background: { service_worker: 'background.js' },
  },
  firefox: {
    ...baseManifest,
    background: { scripts: ['background.js'] },
    browser_specific_settings: {
      gecko: {
        id: 'oldest-first@kishannareshpal',
        strict_min_version: '128.0',
        data_collection_permissions: { required: ['none'] },
      },
    },
  },
};

const entryPoints = {
  'main-world': 'src/main-world.ts',
  bridge: 'src/bridge.ts',
  background: 'src/background.ts',
};

for (const [browser, manifest] of Object.entries(manifests)) {
  const outdir = `dist/${browser}`;
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await writeFile(`${outdir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

  const options = {
    entryPoints,
    outdir,
    bundle: true,
    format: 'iife',
    target: ['chrome111', 'firefox128'],
    logLevel: 'info',
  };

  if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
  } else {
    await esbuild.build(options);
  }
}
