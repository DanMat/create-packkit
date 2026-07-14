import { toJson } from '../render.js';

export default {
  id: 'lint',
  active: (cfg) => cfg.lint !== 'none',
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };

    if (cfg.lint === 'eslint-prettier' || cfg.lint === 'oxlint') {
      // Prettier is shared by both.
      files['.prettierrc.json'] = toJson({
        useTabs: true,
        singleQuote: true,
        semi: true,
        printWidth: 100,
        trailingComma: 'all',
      });
      files['.prettierignore'] = 'dist\ncoverage\n';
      pkg.scripts.format = 'prettier --write .';
      pkg.scripts['format:check'] = 'prettier --check .';
      pkg.devDependencies.prettier = '^3.3.0';
    }

    if (cfg.lint === 'eslint-prettier') {
      files['eslint.config.js'] = eslintFlatConfig(cfg);
      pkg.scripts.lint = 'eslint .';
      pkg.scripts['lint:fix'] = 'eslint . --fix';
      pkg.devDependencies.eslint = '^10.0.0';
      pkg.devDependencies['@eslint/js'] = '^10.0.0';
      if (cfg.isTs) pkg.devDependencies['typescript-eslint'] = '^8.0.0';
    } else if (cfg.lint === 'oxlint') {
      pkg.scripts.lint = 'oxlint';
      pkg.devDependencies.oxlint = '^1.0.0';
    } else if (cfg.lint === 'biome') {
      files['biome.json'] = toJson({
        $schema: 'https://biomejs.dev/schemas/2.0.0/schema.json',
        formatter: { enabled: true, indentStyle: 'tab', lineWidth: 100 },
        linter: { enabled: true, rules: { recommended: true } },
        javascript: { formatter: { quoteStyle: 'single', trailingCommas: 'all' } },
      });
      pkg.scripts.lint = 'biome check .';
      pkg.scripts['lint:fix'] = 'biome check --write .';
      pkg.scripts.format = 'biome format --write .';
      pkg.devDependencies['@biomejs/biome'] = '^2.0.0';
    }

    return { files, pkg };
  },
};

function eslintFlatConfig(cfg) {
  if (cfg.isTs) {
    return [
      `import js from '@eslint/js';`,
      `import tseslint from 'typescript-eslint';`,
      ``,
      `export default tseslint.config(`,
      `\tjs.configs.recommended,`,
      `\t...tseslint.configs.recommended,`,
      `\t{ ignores: ['dist', 'coverage'] },`,
      `);`,
      ``,
    ].join('\n');
  }
  return [
    `import js from '@eslint/js';`,
    ``,
    `export default [`,
    `\tjs.configs.recommended,`,
    `\t{ languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } },`,
    `\t{ ignores: ['dist', 'coverage'] },`,
    `];`,
    ``,
  ].join('\n');
}
