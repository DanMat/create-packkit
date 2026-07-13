// CLI target: a `bin` entry + a minimal command scaffold with a shebang.

export default {
  id: 'cli',
  active: (cfg) => cfg.hasCli,
  apply(cfg) {
    const build = cfg.bundler !== 'none';
    const binPath = build || cfg.isTs ? './dist/cli.js' : './src/cli.js';
    const files = {};

    files[`src/cli.${cfg.ext}`] = cliScaffold(cfg);

    return {
      files,
      pkg: {
        bin: { [binName(cfg.name)]: binPath },
      },
    };
  },
};

function binName(name) {
  // scoped packages -> use the part after the slash as the command
  return name.startsWith('@') ? name.split('/')[1] : name;
}

function cliScaffold(cfg) {
  const importLine = cfg.hasLibrary
    ? `import { greet } from './index.${cfg.isTs ? 'js' : 'js'}';\n`
    : '';
  const body = cfg.hasLibrary
    ? `const name = process.argv[2] ?? 'world';\nconsole.log(greet(name));\n`
    : `console.log('${cfg.name} — hello from your CLI');\n`;
  return `#!/usr/bin/env node\n${importLine}\n${body}`;
}
