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

    // Source entry point.
    const ext = cfg.ext;
    files[`src/index.${ext}`] = cfg.hasLibrary
      ? libraryEntry(cfg)
      : `// ${cfg.name}\n`;

    // README
    files['README.md'] = readme(cfg);

    // Node version pin
    files['.nvmrc'] = `${cfg.nodeVersion}\n`;

    // A typecheck script for TS projects regardless of bundler.
    if (cfg.isTs) pkg.scripts.typecheck = 'tsc --noEmit';

    return { files, pkg };
  },
};

function libraryEntry(cfg) {
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

  if (cfg.hasLibrary) {
    const imp = cfg.isTs || cfg.hasEsm ? `import { greet } from '${cfg.name}';` : `const { greet } = require('${cfg.name}');`;
    lines.push('## Usage', '', '```' + (cfg.isTs ? 'ts' : 'js'), imp, '', `greet('world'); // "Hello, world!"`, '```', '');
  }
  if (cfg.hasCli) {
    lines.push('## CLI', '', '```sh', `npx ${cfg.name} --help`, '```', '');
  }

  lines.push('## License', '', cfg.license === 'none' ? 'Unlicensed.' : `${cfg.license}${cfg.author ? ' © ' + cfg.author : ''}`, '');
  return lines.join('\n');
}
