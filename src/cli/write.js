import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Write a { path: contents } map under `targetDir`.
 * In `merge` mode an existing file is never touched — it's reported as skipped,
 * so scaffolding into a repo that already has files can't destroy work.
 * Returns { written, skipped } as arrays of relative paths.
 */
export async function writeProject(targetDir, files, { merge = false } = {}) {
  const written = [];
  const skipped = [];
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(targetDir, rel);
    if (merge && existsSync(full)) {
      skipped.push(rel);
      continue;
    }
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, contents);
    written.push(rel);
  }
  return { written, skipped };
}

// Entries that don't make a directory "occupied": VCS metadata and OS noise.
// `git clone` of a fresh empty repo leaves .git/ behind, and treating that as
// non-empty broke the most common flow — create the repo, clone it, scaffold in.
const IGNORED_ENTRIES = new Set(['.git', '.DS_Store', 'Thumbs.db', '.hg', '.svn']);

/** Real (non-ignorable) entries in `dir`. Empty when the dir is missing. */
export function existingEntries(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((e) => !IGNORED_ENTRIES.has(e));
  } catch {
    return [];
  }
}

/** True if the directory doesn't exist or holds nothing that would be clobbered. */
export function dirIsEmptyOrMissing(dir) {
  return existingEntries(dir).length === 0;
}

/** Run a command in `cwd` (arg array — no shell parsing). Never throws. */
export function run(cmd, args, cwd, { quiet = true } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: quiet ? 'ignore' : 'inherit',
    shell: process.platform === 'win32',
  });
  return res.status === 0;
}

/** git init + initial commit. Returns true on success. */
export function gitInit(cwd) {
  if (!run('git', ['init', '--quiet'], cwd)) return false;
  run('git', ['add', '-A'], cwd);
  return run('git', ['commit', '-m', 'Initial commit from Packkit', '--quiet'], cwd);
}

/** Install dependencies with the chosen package manager. */
export function installDeps(pm, cwd) {
  return run(pm, ['install'], cwd, { quiet: false });
}

// Resolving the dependency graph without downloading it. Yarn has no equivalent
// that works across its v1/v2+ split, so it's left out and reported instead.
const LOCKFILE_ONLY = {
  npm: ['install', '--package-lock-only', '--ignore-scripts'],
  pnpm: ['install', '--lockfile-only', '--ignore-scripts'],
  bun: ['install', '--lockfile-only'],
};

/**
 * Write a lockfile without installing.
 *
 * A pushed repo with no lockfile fails CI on its very first run — `cache: npm`
 * in actions/setup-node errors outright when it can't find one. So when we're
 * about to create a remote but the install was skipped, produce the lockfile
 * anyway. Returns false when the package manager has no such mode.
 */
export function writeLockfile(pm, cwd) {
  const args = LOCKFILE_ONLY[pm];
  return args ? run(pm, args, cwd) : false;
}

/** Run a command and capture its output. Never throws. */
function capture(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  return {
    ok: res.status === 0,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

/** True if `cmd` is on PATH. */
export function hasCommand(cmd) {
  return capture(process.platform === 'win32' ? 'where' : 'which', [cmd], process.cwd()).ok;
}

/** The authenticated GitHub login, or null if gh isn't installed or logged in. */
export function githubLogin() {
  const res = capture('gh', ['api', 'user', '-q', '.login'], process.cwd());
  return res.ok && res.stdout ? res.stdout : null;
}

/**
 * Create the GitHub repo and push to it, via the `gh` CLI.
 *
 * Deliberately shells out rather than calling the REST API: `gh` already owns
 * the user's credentials, so Packkit never reads, prompts for, or stores a
 * token. Returns { ok, error }.
 */
export function createGithubRepo({ slug, description, private: isPrivate = true, cwd }) {
  const args = ['repo', 'create', slug, isPrivate ? '--private' : '--public',
    '--source', '.', '--remote', 'origin', '--push'];
  if (description) args.push('--description', description);
  const res = capture('gh', args, cwd);
  return { ok: res.ok, error: res.stderr || res.stdout };
}

/** Point `origin` at an existing remote URL and push the current branch. */
export function pushToRemote(url, cwd) {
  const added = capture('git', ['remote', 'add', 'origin', url], cwd);
  if (!added.ok) return { ok: false, error: added.stderr };
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const res = capture('git', ['push', '-u', 'origin', branch.ok ? branch.stdout : 'main'], cwd);
  return { ok: res.ok, error: res.stderr };
}

/** Stage and commit everything if the tree is dirty. No-op on a clean tree. */
export function commitAll(cwd, message) {
  if (!capture('git', ['status', '--porcelain'], cwd).stdout) return false;
  run('git', ['add', '-A'], cwd);
  return run('git', ['commit', '-m', message, '--quiet'], cwd);
}
