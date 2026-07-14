// Shared Node-version logic. Browser-safe (no node builtins) so the generator
// and the CLI preflight agree on exactly one source of truth.
//
// Two concerns, two sources:
//   - which majors we offer + the exact patch to pin  -> node-versions.js,
//     auto-derived from Node's release schedule + dist index (never guessed).
//   - the minimum patch *within a major* our template deps need -> ENGINE_MIN,
//     below, driven by our deps (eslint/vite), governed by the template-deps
//     freshness workflow. These change rarely and independently of Node.

import { NODE_LINES, DEFAULT_NODE } from './node-versions.js';

export { NODE_LINES, DEFAULT_NODE };

// eslint 10 needs ^20.19/^22.13; vite 8 needs ^20.19/^22.12 — take the max.
export const ENGINE_MIN = { 18: '18.18.0', 20: '20.19.0', 22: '22.13.0' };

/** The `engines` minimum for a target major (a floor, not a pin). */
export const engineFloor = (v) => ENGINE_MIN[v] || `${v}.0.0`;

/** The exact version to pin in `.nvmrc` — that line's newest patch, or the floor. */
export const nodePin = (v) => NODE_LINES[v]?.version || engineFloor(v);

const parts = (s) =>
  String(s).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

/** True if `current` (e.g. "v22.5.0" or process.version) is >= `floor` ("22.13.0"). */
export function meetsNodeFloor(current, floor) {
  const [a, b, c] = parts(current);
  const [x, y, z] = parts(floor);
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c >= z;
}
