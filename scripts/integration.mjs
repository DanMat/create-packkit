#!/usr/bin/env node
// Integration test: generate a preset, install its dependencies, and run the
// generated project's own checks (typecheck / lint / build / test, plus a real
// server start for services). This is what proves a template-dependency bump
// didn't break the projects Packkit produces.
//
//   node scripts/integration.mjs <preset> [extra flags...]

import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('usage: node scripts/integration.mjs <preset> [flags...]');
  process.exit(2);
}
const label = argv.join(' ');

const work = mkdtempSync(join(tmpdir(), 'packkit-int-'));
const app = join(work, 'app');

function step(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { stdio: 'inherit', ...opts }).status === 0;
}

// 1) generate via the real CLI (non-interactive)
if (!step('node', [join(repo, 'bin/cli.js'), ...argv, 'app', '--no-git', '--no-install'], { cwd: work })) {
  console.error(`\n✗ [${label}] generation failed`);
  process.exit(1);
}

// Real usage runs `git init` before install; some hook `prepare` scripts
// (e.g. lefthook install) require a .git directory.
spawnSync('git', ['init', '--quiet'], { cwd: app });

const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};
const pm =
  existsSync(join(app, 'pnpm-workspace.yaml')) || String(pkg.packageManager || '').startsWith('pnpm')
    ? 'pnpm'
    : 'npm';

console.log(`\n=== integration: ${label} (pm: ${pm}) ===`);

// 2) install
if (!step(pm, ['install'], { cwd: app })) {
  console.error(`\n✗ [${label}] install failed`);
  process.exit(1);
}

// 3) run the generated project's checks (only those it actually defines)
for (const s of ['typecheck', 'lint', 'build', 'test', 'build-storybook']) {
  if (!scripts[s]) continue;
  const ok = pm === 'npm' ? step('npm', ['run', s], { cwd: app }) : step(pm, [s], { cwd: app });
  if (!ok) {
    console.error(`\n✗ [${label}] "${s}" failed`);
    process.exit(1);
  }
}

// 4) services: prove the built server actually starts and responds
if (scripts.start && pkg.dependencies && pkg.dependencies.hono) {
  console.log('\n$ node dist/index.js  (checking /health)');
  const child = spawn('node', ['dist/index.js'], { cwd: app, stdio: 'inherit' });
  let ok = false;
  for (let i = 0; i < 20 && !ok; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:3000/health');
      ok = res.ok;
    } catch {
      /* not up yet */
    }
  }
  child.kill();
  if (!ok) {
    console.error(`\n✗ [${label}] service did not respond on /health`);
    process.exit(1);
  }
  console.log('✓ service responded on /health');
}

console.log(`\n✅ [${label}] all checks passed`);
