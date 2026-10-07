// Publishes the next version (CalVer YYYY.MM.DD.n) as a GitHub Release. Publishing creates the tag and starts
// .github/workflows/release.yml, which builds and attaches the extension zips. Run it with `pnpm release`.
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { nextVersion, parseRemoteTags } from './release-version.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (git('status', '--porcelain')) fail('working tree is dirty; commit or stash before releasing');

const branch = git('branch', '--show-current');
if (branch !== 'main') fail(`must release from main (on ${branch || 'a detached HEAD'})`);

execFileSync('git', ['fetch', 'origin', '--tags'], { stdio: 'inherit' });
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
  fail('main is not in sync with origin/main; pull or push first');
}

const version = nextVersion(new Date(), parseRemoteTags(git('ls-remote', '--tags', 'origin')));

const prompt = createInterface({ input: process.stdin, output: process.stdout });
console.log('Creates the git tag and a GitHub Release, which starts the release workflow.');
const answer = await prompt.question(`Publish Oldest First ${version}? [y/N] `);
prompt.close();
if (!/^y(es)?$/i.test(answer.trim())) fail('cancelled');

execFileSync('gh', ['release', 'create', version, '--generate-notes', '--title', version], { stdio: 'inherit' });
console.log(`Published ${version}. The release workflow will build and attach the extension zips.`);
