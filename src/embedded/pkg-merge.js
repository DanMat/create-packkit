// Provenance-tracked package.json analysis.
//
// The core already merges feature fragments (deepMerge, last writer wins) to
// produce the actual package.json. This module does not replace that — it runs
// alongside it to answer "who set this field, and did two contributors
// disagree?", so the embedded API can report conflicts instead of letting a
// silent overwrite hide a bug.

// Fields where two contributors setting the *same leaf* to *different values*
// is a real conflict a host should hear about. Dependency maps are handled
// separately (version-aware, per section); everything else deep-merges.
const PROTECTED = new Set(['scripts', 'exports', 'bin', 'main', 'module', 'types', 'files', 'engines', 'packageManager']);
const DEP_MAPS = new Set(['dependencies', 'devDependencies', 'peerDependencies']);

/**
 * Analyze an ordered list of { source, pkg } fragments.
 * Returns { diagnostics } describing every protected-field leaf that two
 * sources set to conflicting values, and every dependency pinned to two
 * different versions *within the same section*. Does not produce package.json.
 */
export function analyzePkgFragments(fragments) {
  const diagnostics = [];
  const leaves = new Map(); // rendered leaf path -> { value, source }
  // Keyed by section + name, so `dependencies.react` and `peerDependencies.react`
  // are distinct — differing versions across those sections is normal, not a bug.
  const deps = new Map();

  for (const { source, pkg } of fragments) {
    for (const [topKey, value] of Object.entries(pkg)) {
      if (DEP_MAPS.has(topKey)) {
        for (const [dep, version] of Object.entries(value || {})) {
          const key = `${topKey}:${dep}`;
          const prev = deps.get(key);
          if (prev && prev.version !== version) {
            diagnostics.push({
              severity: 'warning',
              code: 'DEPENDENCY_VERSION_CONFLICT',
              field: `${topKey}.${dep}`,
              message: `"${dep}" in ${topKey} is requested at ${prev.version} (by ${prev.source}) and ${version} (by ${source}).`,
              source: 'package-merge',
              previousValue: prev.version,
              resolvedValue: version,
            });
          }
          deps.set(key, { version, source });
        }
        continue;
      }
      if (PROTECTED.has(topKey)) {
        collectLeaves([topKey], value, (segments, leafValue) => {
          const rendered = renderPath(segments);
          const prev = leaves.get(rendered);
          if (prev && JSON.stringify(prev.value) !== JSON.stringify(leafValue)) {
            diagnostics.push({
              severity: 'warning',
              code: 'PACKAGE_FIELD_CONFLICT',
              field: rendered,
              message: `"${rendered}" is set to different values by ${prev.source} and ${source}; the later one wins.`,
              source: 'package-merge',
              previousValue: prev.value,
              resolvedValue: leafValue,
            });
          }
          leaves.set(rendered, { value: leafValue, source });
        });
      }
    }
  }
  return { diagnostics };
}

// Recursively flatten a protected field to its leaf values, carrying the key
// path as an array so a key that itself contains a dot (e.g. exports './sub.js')
// isn't mistaken for two segments.
function collectLeaves(segments, value, emit) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) collectLeaves([...segments, k], v, emit);
  } else {
    emit(segments, value);
  }
}

// Render a segment path for human-facing diagnostics. Dotted segments get
// bracket notation so the field reads unambiguously.
function renderPath(segments) {
  return segments
    .map((s, i) => (i > 0 && s.includes('.') ? `['${s}']` : i > 0 ? `.${s}` : s))
    .join('');
}
