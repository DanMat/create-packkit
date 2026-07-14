import { toJson } from '../render.js';

export default {
  id: 'release',
  active: (cfg) => cfg.release !== 'none',
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };

    if (cfg.release === 'changesets') {
      files['.changeset/config.json'] = toJson({
        $schema: 'https://unpkg.com/@changesets/config@3.0.0/schema.json',
        changelog: '@changesets/cli/changelog',
        commit: false,
        access: 'public',
        baseBranch: 'main',
        updateInternalDependencies: 'patch',
      });
      files['.changeset/README.md'] =
        '# Changesets\n\nRun `npx changeset` to record a version bump for your next release.\n';
      pkg.scripts.changeset = 'changeset';
      pkg.scripts.version = 'changeset version';
      pkg.scripts.release = `${buildThen(cfg)}changeset publish`;
      pkg.devDependencies['@changesets/cli'] = '^2.27.0';
    } else if (cfg.release === 'release-it') {
      files['.release-it.json'] = toJson({
        git: { commitMessage: 'chore: release v${version}' },
        github: { release: true },
        npm: { publish: true },
      });
      pkg.scripts.release = 'release-it';
      pkg.devDependencies['release-it'] = '^20.0.0';
    } else if (cfg.release === 'np') {
      pkg.scripts.release = 'np';
      pkg.devDependencies.np = '^11.0.0';
    }

    return { files, pkg };
  },
};

function buildThen(cfg) {
  return cfg.hasBuild ? 'npm run build && ' : '';
}
