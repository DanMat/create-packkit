import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Write a { path: contents } map under `targetDir`. Returns the count. */
export async function writeProject(targetDir, files) {
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(targetDir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, contents);
  }
  return Object.keys(files).length;
}

/** True if the directory doesn't exist or contains no entries. */
export function dirIsEmptyOrMissing(dir) {
  if (!existsSync(dir)) return true;
  try {
    return readdirSync(dir).length === 0;
  } catch {
    return false;
  }
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
