// Package-correctness + hygiene checks (opt-in):
//  - publint            validates package.json shape (exports/main/module)
//  - are-the-types-wrong verifies TS consumers resolve your .d.ts correctly
//  - knip               finds unused files, dependencies, and exports

export default {
  id: 'checks',
  active: (cfg) => cfg.pkgChecks || cfg.knip,
  apply(cfg) {
    const pkg = { scripts: {}, devDependencies: {} };

    if (cfg.pkgChecks) {
      // ESM-only packages have no CJS resolution by design, so attw's default
      // node16 profile flags a "false" failure — use the esm-only profile.
      const attw = cfg.moduleFormat === 'esm' ? 'attw --pack --profile esm-only' : 'attw --pack';
      pkg.scripts['check:pkg'] = `publint && ${attw}`;
      pkg.devDependencies.publint = '^0.3.0';
      pkg.devDependencies['@arethetypeswrong/cli'] = '^0.18.0';
    }
    if (cfg.knip) {
      pkg.scripts.knip = 'knip';
      pkg.devDependencies.knip = '^5.0.0';
    }

    return { files: {}, pkg };
  },
};
