// Always-on. Owns the package entry points (exports/main/module/types/files)
// and the build tooling for the chosen bundler.

export default {
  id: 'bundler',
  active: () => true,
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {} };
    const build = cfg.bundler !== 'none';

    // ---- entry points ----
    if (!build && !cfg.isTs) {
      // Plain JS, no build: ship source directly.
      pkg.files = ['src'];
      pkg.exports = { '.': `./src/index.js` };
      pkg.main = './src/index.js';
      if (cfg.hasEsm) pkg.module = './src/index.js';
    } else {
      pkg.files = ['dist'];
      const esm = './dist/index.js';
      const cjs = './dist/index.cjs';
      const dts = './dist/index.d.ts';
      const exp = {};
      if (cfg.isTs) exp.types = dts;
      if (cfg.hasEsm) exp.import = esm;
      if (cfg.hasCjs) exp.require = build ? cjs : './dist/index.cjs';
      pkg.exports = { '.': exp };
      if (cfg.hasCjs) pkg.main = exp.require;
      else pkg.main = esm;
      if (cfg.hasEsm) pkg.module = esm;
      if (cfg.isTs) pkg.types = dts;
    }

    // ---- build tooling ----
    const entries = ['src/index.' + cfg.srcExt];
    if (cfg.hasCli) entries.push('src/cli.' + cfg.ext);
    const formats = [cfg.hasEsm && 'esm', cfg.hasCjs && 'cjs'].filter(Boolean);

    if (cfg.bundler === 'tsup' || cfg.bundler === 'tsdown') {
      const tool = cfg.bundler;
      files[`${tool}.config.${cfg.ext}`] = tsupConfig(cfg, entries, formats, tool);
      pkg.scripts.build = tool;
      pkg.scripts.dev = `${tool} --watch`;
      pkg.devDependencies = { [tool]: tool === 'tsup' ? '^8.0.0' : '^0.6.0' };
    } else if (cfg.bundler === 'unbuild') {
      files['build.config.ts'] = unbuildConfig(cfg);
      pkg.scripts.build = 'unbuild';
      pkg.scripts.dev = 'unbuild --stub';
      pkg.devDependencies = { unbuild: '^2.0.0' };
    } else if (cfg.bundler === 'rollup') {
      files[`rollup.config.${cfg.ext === 'ts' ? 'ts' : 'js'}`] = rollupConfig(cfg, formats);
      pkg.scripts.build = 'rollup -c';
      pkg.scripts.dev = 'rollup -c -w';
      pkg.devDependencies = {
        rollup: '^4.0.0',
        ...(cfg.isTs ? { '@rollup/plugin-typescript': '^11.0.0', tslib: '^2.6.0' } : {}),
        ...(cfg.minify ? { '@rollup/plugin-terser': '^0.4.0' } : {}),
      };
    } else if (cfg.bundler === 'none' && cfg.isTs) {
      // tsc-only build for TypeScript.
      pkg.scripts.build = 'tsc';
      pkg.scripts.dev = 'tsc --watch';
    }

    if (build) pkg.scripts.prepublishOnly = pkg.scripts.build;
    pkg.scripts.clean = 'rimraf dist';
    if (build) pkg.devDependencies = { ...pkg.devDependencies, rimraf: '^6.0.0' };

    return { files, pkg };
  },
};

function tsupConfig(cfg, entries, formats, tool) {
  return [
    `import { defineConfig } from '${tool}';`,
    ``,
    `export default defineConfig({`,
    `\tentry: [${entries.map((e) => `'${e}'`).join(', ')}],`,
    `\tformat: [${formats.map((f) => `'${f}'`).join(', ')}],`,
    cfg.isTs ? `\tdts: true,` : null,
    `\tsourcemap: true,`,
    `\tclean: true,`,
    `\ttreeshake: true,`,
    cfg.minify ? `\tminify: true,` : null,
    `});`,
    ``,
  ].filter((l) => l !== null).join('\n');
}

function unbuildConfig(cfg) {
  return [
    `import { defineBuildConfig } from 'unbuild';`,
    ``,
    `export default defineBuildConfig({`,
    `\tentries: ['src/index'],`,
    `\tdeclaration: ${cfg.isTs},`,
    `\tclean: true,`,
    `\trollup: { emitCJS: ${cfg.hasCjs}${cfg.minify ? ', esbuild: { minify: true }' : ''} },`,
    `});`,
    ``,
  ].join('\n');
}

function rollupConfig(cfg, formats) {
  const out = formats
    .map((f) => `\t\t{ file: 'dist/index.${f === 'cjs' ? 'cjs' : 'js'}', format: '${f}', sourcemap: true }`)
    .join(',\n');
  const imports = [
    cfg.isTs ? `import typescript from '@rollup/plugin-typescript';` : null,
    cfg.minify ? `import terser from '@rollup/plugin-terser';` : null,
  ].filter(Boolean);
  const plugins = [cfg.isTs ? 'typescript()' : null, cfg.minify ? 'terser()' : null].filter(Boolean);
  const pluginLine = plugins.length ? `\n\tplugins: [${plugins.join(', ')}],` : '';
  return [
    (imports.length ? imports.join('\n') + '\n' : '') + `export default {`,
    `\tinput: 'src/index.${cfg.ext}',`,
    `\toutput: [`,
    out,
    `\t],${pluginLine}`,
    `};`,
    ``,
  ].join('\n');
}
