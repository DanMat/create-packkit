// Path validation for generated and extension-supplied files.
//
// Every path that could reach the filesystem passes through here — once when a
// project is assembled, and again at the writer boundary. A path that escapes
// the destination, is absolute, or is otherwise unsafe is rejected rather than
// written, so a host application embedding Packkit can accept file maps from
// less-trusted sources (extensions, stored definitions) without opening a
// path-traversal hole.

import { posix } from 'node:path';

// Windows reserves these device names regardless of extension (CON.txt is still
// CON). Rejecting them keeps generated projects writable on Windows.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

/**
 * Validate a repo-relative file path. Returns { ok: true, normalized } or
 * { ok: false, code, message }. Pure — never touches the filesystem.
 */
export function validateRelativePath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    return fail('EMPTY_PATH', 'A file path must be a non-empty string.');
  }
  if (path.includes('\0')) {
    return fail('NULL_BYTE', `Path contains a null byte: ${JSON.stringify(path)}`);
  }
  // Treat backslashes as separators so a Windows-style path can't smuggle a
  // segment past the checks below on a POSIX host.
  const unified = path.replace(/\\/g, '/');
  if (/^[a-zA-Z]:/.test(unified) || unified.startsWith('/')) {
    return fail('ABSOLUTE_PATH', `Path must be relative, not absolute: ${path}`);
  }

  const normalized = posix.normalize(unified);
  if (normalized === '.' || normalized === '' || normalized.endsWith('/')) {
    return fail('NOT_A_FILE', `Path does not name a file: ${path}`);
  }
  // normalize() collapses interior `..`; anything that still starts with `..`
  // (or is exactly `..`) escapes the destination.
  if (normalized === '..' || normalized.startsWith('../')) {
    return fail('PATH_ESCAPE', `Path escapes the destination directory: ${path}`);
  }
  for (const segment of normalized.split('/')) {
    if (WINDOWS_RESERVED.test(segment)) {
      return fail('WINDOWS_RESERVED', `Path uses a Windows-reserved name: ${path}`);
    }
  }
  return { ok: true, normalized };
}

/**
 * Validate a whole file map. Returns { paths, diagnostics } where `paths` maps
 * each original key to its normalized form, and diagnostics carries one error
 * per invalid path plus one per case-insensitive collision (two distinct paths
 * that would be the same file on a case-insensitive filesystem).
 */
export function validatePathMap(files) {
  const paths = {};
  const diagnostics = [];
  const lowered = new Map(); // lowercased normalized path -> first original key

  for (const original of Object.keys(files)) {
    const res = validateRelativePath(original);
    if (!res.ok) {
      diagnostics.push({ severity: 'error', code: res.code, message: res.message, source: 'path', field: original });
      continue;
    }
    paths[original] = res.normalized;

    const key = res.normalized.toLowerCase();
    if (lowered.has(key) && lowered.get(key) !== res.normalized) {
      diagnostics.push({
        severity: 'error',
        code: 'CASE_INSENSITIVE_COLLISION',
        message: `"${original}" and "${lowered.get(key)}" are the same file on a case-insensitive filesystem.`,
        source: 'path',
        field: original,
      });
    } else {
      lowered.set(key, res.normalized);
    }
  }
  return { paths, diagnostics };
}

function fail(code, message) {
  return { ok: false, code, message };
}
