// Provenance-tracked package.json analysis.
//
// The core already merges feature fragments (deepMerge, last writer wins) to
// produce the actual package.json. This module does not replace that — it runs
// alongside it to answer "who set this field, and did two contributors
// disagree?", so the embedded API can report conflicts instead of letting a
// silent overwrite hide a bug.

// Fields where two contributors setting the *same leaf* to *different values*
// is a real conflict a host should hear about. Dependency maps are handled
// separately (version-aware); everything else deep-merges additively.
const PROTECTED = new Set(['scripts', 'exports', 'bin', 'main', 'module', 'types', 'files', 'engines', 'packageManager']);
const DEP_MAPS = new Set(['dependencies', 'devDependencies', 'peerDependencies']);

/**
 * Analyze an ordered list of { source, pkg } fragments.
 * Returns { diagnostics } describing every protected-field leaf that two
 * sources set to conflicting values, and every dependency pinned to two
 * different versions. Does not produce package.json — the core owns that.
 */
export function analyzePkgFragments(fragments) {
  const diagnostics = [];
  // leaf path ("scripts.build") -> { value, source }
  const leaves = new Map();
  // dependency name -> { version, source, mapKey }
  const deps = new Map();

  for (const { source, pkg } of fragments) {
    for (const [topKey, value] of Object.entries(pkg)) {
      if (DEP_MAPS.has(topKey)) {
        for (const [dep, version] of Object.entries(value || {})) {
          const prev = deps.get(dep);
          if (prev && prev.version !== version) {
            diagnostics.push({
              severity: 'warning',
              code: 'DEPENDENCY_VERSION_CONFLICT',
              field: `${topKey}.${dep}`,
              message: `"${dep}" is requested at ${prev.version} (by ${prev.source}) and ${version} (by ${source}).`,
              source: 'package-merge',
              previousValue: prev.version,
              resolvedValue: version,
            });
          }
          deps.set(dep, { version, source, mapKey: topKey });
        }
        continue;
      }
      if (PROTECTED.has(topKey)) {
        collectLeaves(topKey, value, (leaf, leafValue) => {
          const prev = leaves.get(leaf);
          if (prev && JSON.stringify(prev.value) !== JSON.stringify(leafValue)) {
            diagnostics.push({
              severity: 'warning',
              code: 'PACKAGE_FIELD_CONFLICT',
              field: leaf,
              message: `"${leaf}" is set to different values by ${prev.source} and ${source}; the later one wins.`,
              source: 'package-merge',
              previousValue: prev.value,
              resolvedValue: leafValue,
            });
          }
          leaves.set(leaf, { value: leafValue, source });
        });
      }
    }
  }
  return { diagnostics };
}

// Flatten one protected field into leaf paths. `scripts.build`, `exports['.']`,
// or the whole value for a scalar field like `main`.
function collectLeaves(topKey, value, emit) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) emit(`${topKey}.${k}`, v);
  } else {
    emit(topKey, value);
  }
}
