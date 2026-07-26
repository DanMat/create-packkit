// Controlled filesystem output for a GeneratedProject.
//
// This is the only place the embedded API touches disk, and it does nothing
// else: no install, no git, no lifecycle scripts, no command execution. Every
// path is validated again here — not just when the project was built — so a
// project that reached this boundary from an untrusted source still can't
// escape the destination directory.

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { validateRelativePath } from './paths.js';

/**
 * Write a project's files under `destination`. Returns a WriteResult; never
 * installs, inits git, or runs anything. Throws before writing if any path is
 * invalid, so a bad file map fails cleanly rather than half-written.
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

  // Validate every path up front. A traversal or absolute path anywhere means
  // we write nothing — no partial, half-escaped output.
  const planned = [];
  for (const [path, contents] of Object.entries(project.files)) {
    const res = validateRelativePath(path);
    if (!res.ok) {
      throw new PackkitWriteError(`Refusing to write invalid path "${path}": ${res.message}`, res.code);
    }
    const target = join(root, res.normalized);
    // Defense in depth: after joining, confirm the absolute target is still
    // inside the destination.
    if (target !== root && !target.startsWith(prefix)) {
      throw new PackkitWriteError(`Refusing to write outside the destination: "${path}"`, 'PATH_ESCAPE');
    }
    planned.push({ path: res.normalized, target, contents });
  }

  const writtenFiles = [];
  const skippedFiles = [];
  const diagnostics = [];

  for (const { path, target, contents } of planned) {
    try {
      if (await exists(target)) {
        if (collisionPolicy === 'error') {
          throw new PackkitWriteError(`"${path}" already exists at the destination.`, 'FILE_EXISTS');
        }
        if (collisionPolicy === 'skip') {
          skippedFiles.push(path);
          diagnostics.push({ severity: 'info', code: 'FILE_SKIPPED', field: path, message: `"${path}" already existed and was left in place.`, source: 'writer' });
          continue;
        }
      }
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
      writtenFiles.push(path);
    } catch (err) {
      if (err instanceof PackkitWriteError) throw err;
      // A real filesystem failure on one file: record it and keep going, so the
      // caller sees exactly what landed and what didn't.
      diagnostics.push({ severity: 'error', code: 'WRITE_FAILED', field: path, message: `Could not write "${path}": ${err.message}`, source: 'writer' });
    }
  }

  return { destination: root, writtenFiles, skippedFiles, diagnostics };
}

export class PackkitWriteError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PackkitWriteError';
    this.code = code;
  }
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
