// Always-on: base package.json descriptive fields + the source entry + README.

// The real minimum patch for each major, driven by our template deps (eslint 10,
// jsdom 29, vite 8 need ^20.19; vite/others need ^22.12). `>=20` would be a lie —
// a user on 20.17 hits EBADENGINE and transitive syntax errors. Keep this honest.
export const NODE_FLOOR = { 18: '18.18.0', 20: '20.19.0', 22: '22.12.0', 24: '24.0.0' };
const nodeFloor = (v) => NODE_FLOOR[v] || `${v}.0.0`;

export default {
  id: 'meta',
  active: () => true,
  apply(cfg) {
    const files = {};
    const pkg = {
      name: cfg.name,
      version: '0.0.0',
      description: cfg.description || '',
      type: cfg.moduleFormat === 'cjs' ? 'commonjs' : 'module',
      engines: { node: `>=${nodeFloor(cfg.nodeVersion)}` },
      scripts: {},
    };

    const kw = String(cfg.keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (kw.length) pkg.keywords = kw;
    if (cfg.license !== 'none') pkg.license = cfg.license;
    if (cfg.author) pkg.author = cfg.author;
    if (cfg.repo) {
      pkg.repository = { type: 'git', url: `git+${cfg.repo.replace(/\.git$/, '')}.git` };
      pkg.bugs = { url: `${cfg.repo.replace(/\.git$/, '')}/issues` };
      pkg.homepage = `${cfg.repo.replace(/\.git$/, '')}#readme`;
    }

    // Source entry point — only the plain library entry lives here; framework
    // and app/cli/service modules write their own source.
    if (cfg.hasLibrary && !cfg.hasFramework) {
      files[`src/index.${cfg.ext}`] = libraryEntry(cfg);
    }

    // README
    files['README.md'] = readme(cfg);

    // Node version pin — the honest floor, so `nvm use` can't land below it.
    files['.nvmrc'] = `${nodeFloor(cfg.nodeVersion)}\n`;

    // A typecheck script for TS projects — framework-aware (plain tsc can't
    // resolve .vue/.svelte modules).
    if (cfg.isTs) {
      pkg.scripts.typecheck = cfg.isVue
        ? 'vue-tsc --noEmit'
        : cfg.isSvelte
          ? 'svelte-check --tsconfig ./tsconfig.json'
          : 'tsc --noEmit';
    }

    return { files, pkg };
  },
};

function libraryEntry(cfg) {
  if (cfg.isReact) return reactEntry(cfg);
  if (cfg.isTs) {
    return [
      `/** Greet someone by name. */`,
      `export function greet(name: string): string {`,
      `\treturn \`Hello, \${name}!\`;`,
      `}`,
      ``,
    ].join('\n');
  }
  return [
    `/**`,
    ` * Greet someone by name.`,
    ` * @param {string} name`,
    ` * @returns {string}`,
    ` */`,
    `export function greet(name) {`,
    `\treturn \`Hello, \${name}!\`;`,
    `}`,
    ``,
  ].join('\n');
}

function run(cfg, script) {
  return cfg.packageManager === 'npm' ? `npm run ${script}` : `${cfg.packageManager} ${script}`;
}

function makeBadges(cfg) {
  const badges = [];
  const publishable = (cfg.hasLibrary || cfg.hasCli) && !cfg.hasApp && !cfg.hasService;
  if (publishable) {
    const enc = encodeURIComponent(cfg.name);
    badges.push(`[![npm](https://img.shields.io/npm/v/${enc}.svg)](https://www.npmjs.com/package/${cfg.name})`);
  }
  const repo = cfg.repo ? cfg.repo.replace(/\.git$/, '') : '';
  if (repo && (cfg.workflows || []).includes('ci')) {
    badges.push(`[![CI](${repo}/actions/workflows/ci.yml/badge.svg)](${repo}/actions/workflows/ci.yml)`);
  }
  if (cfg.license !== 'none') {
    badges.push(`[![License: ${cfg.license}](https://img.shields.io/badge/license-${encodeURIComponent(cfg.license)}-blue.svg)](LICENSE)`);
  }
  return badges.join(' ');
}

function readme(cfg) {
  const install = {
    npm: `npm install ${cfg.name}`,
    pnpm: `pnpm add ${cfg.name}`,
    yarn: `yarn add ${cfg.name}`,
    bun: `bun add ${cfg.name}`,
  }[cfg.packageManager];

  const lines = [
    `# ${cfg.name}`,
    '',
    cfg.description || '_A modern package scaffolded with [Packkit](https://danmat.github.io/create-packkit/)._',
    '',
  ];

  const badges = makeBadges(cfg);
  if (badges) lines.push(badges, '');

  lines.push('## Install', '', '```sh', install, '```', '');

  if (cfg.hasApp) {
    lines.push('## Develop', '', '```sh', run(cfg, 'dev') + '     # start the dev server', run(cfg, 'build') + '   # production build', '```', '');
  } else if (cfg.hasLibrary && cfg.isReact) {
    lines.push('## Usage', '', '```' + (cfg.isTs ? 'tsx' : 'jsx'),
      `import { Button } from '${cfg.name}';`, '', `<Button label="Click me" />`, '```', '');
  } else if (cfg.hasLibrary && cfg.isVue) {
    lines.push('## Usage', '', '```' + (cfg.isTs ? 'ts' : 'js'),
      `import { Button } from '${cfg.name}';`, '// then <Button label="Click me" /> in your template', '```', '');
  } else if (cfg.hasLibrary && cfg.isSvelte) {
    lines.push('## Usage', '', '```svelte',
      `<script>import { Button } from '${cfg.name}';</script>`, '', `<Button label="Click me" />`, '```', '');
  } else if (cfg.hasLibrary) {
    const imp = cfg.isTs || cfg.hasEsm ? `import { greet } from '${cfg.name}';` : `const { greet } = require('${cfg.name}');`;
    lines.push('## Usage', '', '```' + (cfg.isTs ? 'ts' : 'js'), imp, '', `greet('world'); // "Hello, world!"`, '```', '');
  }
  if (cfg.hasCli) {
    lines.push('## CLI', '', '```sh', `npx ${cfg.name} --help`, '```', '');
  }

  lines.push('## License', '', cfg.license === 'none' ? 'Unlicensed.' : `${cfg.license}${cfg.author ? ' © ' + cfg.author : ''}`, '');
  return lines.join('\n');
}
