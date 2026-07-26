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
let argv = process.argv.slice(2);
// --embedded generates through the embedded API instead of the CLI, so the same
// install/build/test/lint checks also cover the programmatic path a host uses.
const embedded = argv.includes('--embedded');
argv = argv.filter((a) => a !== '--embedded');
if (!argv.length) {
  console.error('usage: node scripts/integration.mjs <preset> [flags...] [--embedded]');
  process.exit(2);
}
const label = (embedded ? 'embedded ' : '') + argv.join(' ');

const work = mkdtempSync(join(tmpdir(), 'packkit-int-'));
const app = join(work, 'app');

function step(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { stdio: 'inherit', ...opts }).status === 0;
}

// 1) generate — via the CLI, or (for --embedded) the programmatic API, which
// also adds a deployment workflow, checks the deployment contract, and confirms
// the definition round-trips to an identical digest.
if (embedded) {
  if (!(await generateEmbedded())) process.exit(1);
} else if (!step('node', [join(repo, 'bin/cli.js'), ...argv, 'app', '--no-git', '--no-install'], { cwd: work })) {
  console.error(`\n✗ [${label}] generation failed`);
  process.exit(1);
}

async function generateEmbedded() {
  const { createProject, extendProject, exportProjectDefinition, createProjectFromDefinition, calculateProjectDigest } =
    await import(join(repo, 'src/embedded/index.js'));
  const { writeGeneratedProject } = await import(join(repo, 'src/embedded/writer.js'));

  const preset = argv[0];
  const project = createProject({ preset, name: 'app', overrides: { install: false, gitInit: false } });
  const fatal = project.diagnostics.filter((d) => d.severity === 'error');
  if (fatal.length) {
    console.error(`\n✗ [${label}] createProject reported errors:`, fatal);
    return false;
  }
  const extended = extendProject(project, {
    files: { '.platform/deploy.yml': `# generated deploy contract\n${JSON.stringify(project.deploymentContract, null, 2)}\n` },
  });
  // Reproducibility: a stored definition must rebuild byte-for-byte.
  const recreated = createProjectFromDefinition(exportProjectDefinition(extended));
  if (calculateProjectDigest(extended) !== calculateProjectDigest(recreated)) {
    console.error(`\n✗ [${label}] digest changed after definition round-trip`);
    return false;
  }
  if (!recreated.deploymentContract?.type) {
    console.error(`\n✗ [${label}] missing deployment contract`);
    return false;
  }
  const res = await writeGeneratedProject({ project: recreated, destination: app });
  console.log(`✓ embedded: wrote ${res.writtenFiles.length} files · contract ${recreated.deploymentContract.type} · digest stable`);
  return true;
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
for (const s of ['typecheck', 'lint', 'build', 'size', 'check:pkg', 'test', 'build-storybook']) {
  if (!scripts[s]) continue;
  const ok = pm === 'npm' ? step('npm', ['run', s], { cwd: app }) : step(pm, [s], { cwd: app });
  if (!ok) {
    console.error(`\n✗ [${label}] "${s}" failed`);
    process.exit(1);
  }
}

// 3b) dev/watch smoke — the `dev` (tsup/tsdown/tsc --watch, vite) scripts are
// the first thing users run, and the matrix never exercised them because watch
// mode doesn't exit. Start it, give it time for the first build/boot, and fail
// if it crashes or logs a build error (this is exactly the Node-floor crash we
// missed). "still alive after the settle window" == healthy.
if (scripts.dev) {
  console.log(`\n$ ${pm} run dev  (watch smoke)`);
  const child = spawn(pm, ['run', 'dev'], { cwd: app, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let exited = null;
  child.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
  child.stderr.on('data', (d) => { out += d; process.stderr.write(d); });
  child.on('exit', (code) => { exited = code ?? 0; });
  for (let i = 0; i < 24 && exited === null; i++) await new Promise((r) => setTimeout(r, 500));
  const crashed = exited !== null && exited !== 0;
  const errored = /SyntaxError|ELIFECYCLE|Cannot find module|error TS\d|Build failed|✘ \[ERROR\]/i.test(out);
  try { process.kill(-child.pid); } catch { try { child.kill(); } catch { /* already gone */ } }
  if (crashed || errored) {
    console.error(`\n✗ [${label}] "dev" watch ${crashed ? `exited ${exited}` : 'logged a build error'}`);
    process.exit(1);
  }
  console.log('✓ dev watch started cleanly');
  await new Promise((r) => setTimeout(r, 500)); // free the port before the service check
}

// 3c) e2e: install a browser and run the Playwright suite when present. This
// boots the app's dev server via playwright's webServer, so it also proves the
// app actually serves.
if (scripts['test:e2e']) {
  console.log('\n$ npx playwright install --with-deps chromium');
  if (!step('npx', ['playwright', 'install', '--with-deps', 'chromium'], { cwd: app })) {
    console.error(`\n✗ [${label}] playwright browser install failed`);
    process.exit(1);
  }
  const ok = pm === 'npm' ? step('npm', ['run', 'test:e2e'], { cwd: app }) : step(pm, ['test:e2e'], { cwd: app });
  if (!ok) {
    console.error(`\n✗ [${label}] "test:e2e" failed`);
    process.exit(1);
  }
}

// 4) services: prove the built server actually starts and responds
const deps = pkg.dependencies || {};
if (scripts.start && (deps.hono || deps.fastify || deps.express)) {
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
