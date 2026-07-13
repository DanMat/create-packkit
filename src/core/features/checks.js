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
      pkg.scripts['check:pkg'] = 'publint && attw --pack';
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
