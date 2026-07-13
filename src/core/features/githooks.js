export default {
  id: 'githooks',
  active: (cfg) => cfg.gitHooks !== 'none',
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    const codeGlob = cfg.isTs ? '*.{js,ts}' : '*.js';

    // What runs on staged files depends on the linter choice.
    const staged =
      cfg.lint === 'biome'
        ? { [codeGlob]: 'biome check --write --no-errors-on-unmatched' }
        : cfg.lint === 'eslint-prettier'
          ? { [codeGlob]: ['prettier --write', 'eslint --fix'], '*.{json,md,yml}': 'prettier --write' }
          : cfg.lint === 'oxlint'
            ? { [codeGlob]: ['prettier --write', 'oxlint'], '*.{json,md,yml}': 'prettier --write' }
            : null;

    const needsLintStaged = cfg.gitHooks !== 'lefthook' && staged;

    if (cfg.gitHooks === 'simple-git-hooks') {
      pkg['simple-git-hooks'] = { 'pre-commit': needsLintStaged ? 'npx lint-staged' : 'npm test' };
      pkg.scripts.prepare = 'simple-git-hooks';
      pkg.devDependencies['simple-git-hooks'] = '^2.11.0';
    } else if (cfg.gitHooks === 'husky') {
      files['.husky/pre-commit'] = (needsLintStaged ? 'npx lint-staged\n' : 'npm test\n');
      pkg.scripts.prepare = 'husky';
      pkg.devDependencies.husky = '^9.1.0';
    } else if (cfg.gitHooks === 'lefthook') {
      files['lefthook.yml'] = lefthookYml(cfg, staged);
      pkg.scripts.prepare = 'lefthook install';
      pkg.devDependencies.lefthook = '^1.7.0';
    }

    if (needsLintStaged) {
      pkg['lint-staged'] = staged;
      pkg.devDependencies['lint-staged'] = '^15.2.0';
    }

    return { files, pkg };
  },
};

function lefthookYml(cfg, staged) {
  const cmd =
    cfg.lint === 'biome'
      ? 'biome check --write --no-errors-on-unmatched {staged_files}'
      : cfg.lint === 'none'
        ? 'npm test'
        : 'prettier --write {staged_files}';
  return [
    'pre-commit:',
    '  commands:',
    '    format:',
    `      glob: '*.{js,ts,json,md}'`,
    `      run: ${cmd}`,
    '',
  ].join('\n');
}
