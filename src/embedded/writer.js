// Controlled filesystem output for a GeneratedProject.
//
// This is the only place the embedded API touches disk, and it does nothing
// else: no install, no git, no lifecycle scripts, no command execution. Every
// path is validated again here — not just when the project was built — and the
// real on-disk path is checked for symlinks, so a project that reached this
// boundary from an untrusted source still can't escape the destination.

import { mkdir, writeFile, stat, lstat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { validateRelativePath } from './paths.js';

export class PackkitWriteError extends Error {
  constructor(message, { code, path, destination, cause } = {}) {
    super(message);
    this.name = 'PackkitWriteError';
    this.code = code;
    if (path !== undefined) this.path = path;
    if (destination !== undefined) this.destination = destination;
    if (cause !== undefined) this.cause = cause;
  }
}

/**
 * Write a project's files under `destination`. Returns a WriteResult; never
 * installs, inits git, or runs anything. Validates and preflights everything
 * before the first write, so a bad file map or a policy collision fails cleanly
 * rather than leaving a half-written project.
 *
 * @param {{ project: object, destination: string, collisionPolicy?: 'error'|'skip'|'overwrite' }} input
 */
export async function writeGeneratedProject(input) {
  const { project, destination, collisionPolicy = 'error' } = input || {};
  if (!project || typeof project !== 'object' || !project.files) {
    throw new TypeError('writeGeneratedProject needs a project with a files map.');
  }
  if (typeof destination !== 'string' || destination.length === 0) {
    throw new TypeError('A destination path is required.');
  }
  if (!['error', 'skip', 'overwrite'].includes(collisionPolicy)) {
    throw new TypeError(`Unknown collisionPolicy "${collisionPolicy}".`);
  }

  const root = resolve(destination);
  const prefix = root.endsWith(sep) ? root : root + sep;

  // A symlinked destination could redirect the whole write outside where the
  // caller thinks it's going. Reject it — a host that truly wants this can
  // resolve the real path itself before calling.
  await assertNotSymlink(root, false, root, root);

  // 1) Lexical validation: any traversal/absolute path means we write nothing.
  const planned = [];
  for (const [path, contents] of Object.entries(project.files)) {
    const res = validateRelativePath(path);
    if (!res.ok) {
      throw new PackkitWriteError(`Refusing to write invalid path "${path}": ${res.message}`, { code: res.code, path, destination: root });
    }
    const target = join(root, res.normalized);
    if (target !== root && !target.startsWith(prefix)) {
      throw new PackkitWriteError(`Refusing to write outside the destination: "${path}"`, { code: 'PATH_ESCAPE', path, destination: root });
    }
    planned.push({ path: res.normalized, target, contents });
  }

  // 2) Symlink + collision preflight against the real filesystem, before any
  // write. Under the 'error' policy, one existing target aborts the whole
  // operation with every collision listed — no partial output.
  const collisions = [];
  for (const { path, target } of planned) {
    await assertNoSymlinkComponents(root, target, path);
    if (await exists(target)) {
      if (collisionPolicy === 'error') collisions.push(path);
    }
  }
  if (collisions.length) {
    throw new PackkitWriteError(
      `Refusing to overwrite existing file(s): ${collisions.join(', ')}`,
      { code: 'FILE_EXISTS', destination: root },
    );
  }

  // 3) Write.
  const writtenFiles = [];
  const skippedFiles = [];
  const diagnostics = [];
  for (const { path, target, contents } of planned) {
    try {
      if ((collisionPolicy === 'skip') && (await exists(target))) {
        skippedFiles.push(path);
        diagnostics.push({ severity: 'info', code: 'FILE_SKIPPED', field: path, message: `"${path}" already existed and was left in place.`, source: 'writer' });
        continue;
      }
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
      writtenFiles.push(path);
    } catch (err) {
      // A real filesystem failure on one file: record it, keep going, so the
      // caller sees exactly what landed and what didn't.
      diagnostics.push({ severity: 'error', code: 'WRITE_FAILED', field: path, message: `Could not write "${path}": ${err.message}`, source: 'writer' });
    }
  }

  return { destination: root, writtenFiles, skippedFiles, diagnostics };
}

// Reject any existing symlink among the path components from root to target,
// including the target itself — a lexical containment check can't catch
// `dest/link -> /elsewhere`, but following real inodes can. Writing through an
// existing symlink (even the final file, under 'overwrite') would escape.
async function assertNoSymlinkComponents(root, target, path) {
  const rel = target.slice(root.length + 1);
  if (!rel) return;
  const segments = rel.split(sep);
  let current = root;
  for (let i = 0; i < segments.length; i++) {
    current = join(current, segments[i]);
    const isFinal = i === segments.length - 1;
    await assertNotSymlink(current, isFinal, path, root);
  }
}

async function assertNotSymlink(component, isFinal, path, destination) {
  try {
    const info = await lstat(component);
    if (info.isSymbolicLink()) {
      throw new PackkitWriteError(`Refusing to write through a symbolic link: "${component}"`, { code: 'SYMLINK_PATH', path, destination });
    }
    // Intermediate components must be directories; the final one may already
    // exist as a regular file (collision handling decides what to do with it).
    if (!info.isDirectory() && !isFinal) {
      throw new PackkitWriteError(`A parent path component is not a directory: "${component}"`, { code: 'PARENT_NOT_DIRECTORY', path, destination });
    }
  } catch (err) {
    if (err instanceof PackkitWriteError) throw err;
    if (err.code === 'ENOENT') return; // doesn't exist yet; nothing to follow
    throw new PackkitWriteError(`Could not inspect "${component}": ${err.message}`, { code: 'STAT_FAILED', path, destination, cause: err });
  }
}

// Only ENOENT means "not there" — permission and I/O errors are real problems
// and must surface, not be silently read as a missing file.
async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw new PackkitWriteError(`Could not stat "${p}": ${err.message}`, { code: 'STAT_FAILED', cause: err });
  }
}
