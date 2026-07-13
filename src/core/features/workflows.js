import { toJson } from '../render.js';

// package-manager helpers ----------------------------------------------------
function pmInstall(cfg) {
  return {
    npm: 'npm ci',
    pnpm: 'pnpm install --frozen-lockfile',
    yarn: 'yarn install --immutable',
    bun: 'bun install --frozen-lockfile',
  }[cfg.packageManager];
}
function pmRun(cfg, script) {
  return cfg.packageManager === 'npm' ? `npm run ${script}` : `${cfg.packageManager} ${script}`;
}
function setupSteps(cfg) {
  const steps = ['      - uses: actions/checkout@v4'];
  if (cfg.packageManager === 'pnpm') steps.push('      - uses: pnpm/action-setup@v4');
  if (cfg.packageManager === 'bun') {
    steps.push('      - uses: oven-sh/setup-bun@v2');
  } else {
    steps.push(
      '      - uses: actions/setup-node@v4',
      '        with:',
      `          node-version: '${cfg.nodeVersion}'`,
      `          cache: '${cfg.packageManager === 'yarn' ? 'yarn' : cfg.packageManager === 'pnpm' ? 'pnpm' : 'npm'}'`,
    );
  }
  steps.push(`      - run: ${pmInstall(cfg)}`);
  return steps.join('\n');
}

export default {
  id: 'workflows',
  active: (cfg) => (cfg.workflows && cfg.workflows.length) || cfg.deps !== 'none',
  apply(cfg) {
    const files = {};
    const wf = cfg.workflows || [];

    if (wf.includes('ci')) files['.github/workflows/ci.yml'] = ciWorkflow(cfg, wf.includes('codecov'));
    if (wf.includes('npm-publish')) files['.github/workflows/release.yml'] = releaseWorkflow(cfg);
    if (wf.includes('pages')) files['.github/workflows/pages.yml'] = pagesWorkflow(cfg);
    if (wf.includes('codeql')) files['.github/workflows/codeql.yml'] = codeqlWorkflow();
    if (wf.includes('stale')) files['.github/workflows/stale.yml'] = staleWorkflow();

    if (cfg.deps === 'renovate') {
      files['.github/renovate.json'] = toJson({
        $schema: 'https://docs.renovatebot.com/renovate-schema.json',
        extends: ['config:recommended', ':semanticCommits'],
      });
    } else if (cfg.deps === 'dependabot') {
      files['.github/dependabot.yml'] = [
        'version: 2',
        'updates:',
        '  - package-ecosystem: npm',
        '    directory: "/"',
        '    schedule:',
        '      interval: weekly',
        '  - package-ecosystem: github-actions',
        '    directory: "/"',
        '    schedule:',
        '      interval: weekly',
        '',
      ].join('\n');
    }

    return { files, pkg: {} };
  },
};

function ciWorkflow(cfg, codecov) {
  const jobs = [];
  if (cfg.isTs) jobs.push(`      - run: ${pmRun(cfg, 'typecheck')}`);
  if (cfg.lint !== 'none') jobs.push(`      - run: ${pmRun(cfg, 'lint')}`);
  if (cfg.test !== 'none') jobs.push(`      - run: ${pmRun(cfg, codecov ? 'coverage' : 'test')}`);
  if (cfg.bundler !== 'none' || cfg.isTs) jobs.push(`      - run: ${pmRun(cfg, 'build')}`);
  const cov = codecov
    ? '\n      - uses: codecov/codecov-action@v4\n        with:\n          token: ${{ secrets.CODECOV_TOKEN }}'
    : '';
  return [
    'name: CI',
    'on:',
    '  push:',
    '    branches: [main]',
    '  pull_request:',
    'jobs:',
    '  ci:',
    '    runs-on: ubuntu-latest',
    setupSteps(cfg),
    jobs.join('\n') + cov,
    '',
  ].join('\n');
}

function releaseWorkflow(cfg) {
  if (cfg.release === 'changesets') {
    return [
      'name: Release',
      'on:',
      '  push:',
      '    branches: [main]',
      'concurrency: ${{ github.workflow }}-${{ github.ref }}',
      'permissions:',
      '  contents: write',
      '  pull-requests: write',
      '  id-token: write',
      'jobs:',
      '  release:',
      '    runs-on: ubuntu-latest',
      setupSteps(cfg),
      '      - uses: changesets/action@v1',
      '        with:',
      `          publish: ${pmRun(cfg, 'release')}`,
      '          version: ' + pmRun(cfg, 'version'),
      '        env:',
      '          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}',
      '          NPM_CONFIG_PROVENANCE: "true"',
      '        # add NPM_TOKEN as a repo secret, or use npm Trusted Publishing (OIDC)',
      '',
    ].join('\n');
  }
  // tag-triggered publish with provenance
  return [
    'name: Publish',
    'on:',
    '  push:',
    '    tags: ["v*"]',
    'permissions:',
    '  contents: read',
    '  id-token: write',
    'jobs:',
    '  publish:',
    '    runs-on: ubuntu-latest',
    setupSteps(cfg),
    cfg.bundler !== 'none' || cfg.isTs ? `      - run: ${pmRun(cfg, 'build')}` : null,
    '      - run: npm publish --provenance --access public',
    '        env:',
    '          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}',
    '',
  ].filter((l) => l !== null).join('\n');
}

function pagesWorkflow(cfg) {
  return [
    'name: Deploy Pages',
    'on:',
    '  push:',
    '    branches: [main]',
    'permissions:',
    '  contents: read',
    '  pages: write',
    '  id-token: write',
    'concurrency:',
    '  group: pages',
    '  cancel-in-progress: true',
    'jobs:',
    '  deploy:',
    '    environment:',
    '      name: github-pages',
    '      url: ${{ steps.deployment.outputs.page_url }}',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/configure-pages@v5',
    '      - uses: actions/upload-pages-artifact@v3',
    '        with:',
    '          path: ./docs',
    '      - id: deployment',
    '        uses: actions/deploy-pages@v4',
    '',
  ].join('\n');
}

function codeqlWorkflow() {
  return [
    'name: CodeQL',
    'on:',
    '  push:',
    '    branches: [main]',
    '  pull_request:',
    '  schedule:',
    '    - cron: "0 6 * * 1"',
    'jobs:',
    '  analyze:',
    '    runs-on: ubuntu-latest',
    '    permissions:',
    '      security-events: write',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: github/codeql-action/init@v3',
    '        with:',
    '          languages: javascript-typescript',
    '      - uses: github/codeql-action/analyze@v3',
    '',
  ].join('\n');
}

function staleWorkflow() {
  return [
    'name: Stale',
    'on:',
    '  schedule:',
    '    - cron: "0 0 * * *"',
    'jobs:',
    '  stale:',
    '    runs-on: ubuntu-latest',
    '    permissions:',
    '      issues: write',
    '      pull-requests: write',
    '    steps:',
    '      - uses: actions/stale@v9',
    '        with:',
    '          days-before-stale: 60',
    '          days-before-close: 7',
    '',
  ].join('\n');
}
