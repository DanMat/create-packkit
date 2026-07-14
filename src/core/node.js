// Shared Node-version floor logic. Browser-safe (no node builtins) so both the
// generator and the CLI preflight agree on exactly one source of truth.

// The real minimum patch for each supported major, driven by our template deps
// (eslint 10, jsdom 29, vite 8 need ^20.19; vite/others need ^22.12). Writing a
// bare ">=20" would be a lie — a user on 20.17 hits EBADENGINE and transitive
// syntax errors. Keep this honest.
export const NODE_FLOOR = { 18: '18.18.0', 20: '20.19.0', 22: '22.12.0', 24: '24.0.0' };

export const nodeFloor = (v) => NODE_FLOOR[v] || `${v}.0.0`;

const parts = (s) =>
  String(s).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

/** True if `current` (e.g. "v20.17.0" or process.version) is >= `floor` ("20.19.0"). */
export function meetsNodeFloor(current, floor) {
  const [a, b, c] = parts(current);
  const [x, y, z] = parts(floor);
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c >= z;
}
