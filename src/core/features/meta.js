// Always-on: base package.json descriptive fields + the source entry + README.

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
      engines: { node: `>=${cfg.nodeVersion}` },
      scripts: {},
    };

    const kw = String(cfg.keywords || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (kw.length) pkg.keywords = kw;
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

    // Node version pin
    files['.nvmrc'] = `${cfg.nodeVersion}\n`;

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
    '## Install',
    '',
    '```sh',
    install,
    '```',
    '',
  ];

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
