// Finalize the accumulated package.json: order top-level keys sensibly and
// sort dependency maps alphabetically (matches what `npm`/formatters produce).

const KEY_ORDER = [
  'name', 'version', 'description', 'keywords', 'homepage', 'bugs', 'repository',
  'license', 'author', 'type', 'exports', 'main', 'module', 'types', 'bin',
  'files', 'engines', 'packageManager', 'scripts', 'simple-git-hooks', 'lint-staged',
  'dependencies', 'peerDependencies', 'devDependencies', 'publishConfig',
];

export function finalizePackageJson(pkg) {
  const out = {};
  for (const key of KEY_ORDER) {
    if (pkg[key] === undefined) continue;
    out[key] = isDepMap(key) ? sortKeys(pkg[key]) : pkg[key];
  }
  // Carry through anything not in the canonical order (future-proofing).
  for (const key of Object.keys(pkg)) {
    if (!(key in out)) out[key] = pkg[key];
  }
  return out;
}

function isDepMap(key) {
  return key === 'dependencies' || key === 'devDependencies' || key === 'peerDependencies';
}

function sortKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}
