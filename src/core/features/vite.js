// Vite build path: powers Vite SPA apps (React/Vue/Svelte) and Vue component
// libraries (SFCs need a real compiler). Owns the vite config, build scripts,
// and — for libraries — the package entry points. index.html + source come
// from frameworks.js. Svelte libraries ship source and don't come through here.

const PLUGIN = {
  react: { import: `import react from '@vitejs/plugin-react';`, call: 'react()', dep: { '@vitejs/plugin-react': '^4.3.0' } },
  vue: { import: `import vue from '@vitejs/plugin-vue';`, call: 'vue()', dep: { '@vitejs/plugin-vue': '^5.1.0' } },
  svelte: { import: `import { svelte } from '@sveltejs/vite-plugin-svelte';`, call: 'svelte()', dep: { '@sveltejs/vite-plugin-svelte': '^4.0.0' } },
};

export default {
  id: 'vite',
  active: (cfg) => cfg.viteBuild,
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: { vite: '^5.4.0' } };
    const p = PLUGIN[cfg.framework];
    Object.assign(pkg.devDependencies, p.dep);
    if (cfg.isVue && cfg.isTs) pkg.devDependencies['vue-tsc'] = '^2.0.0';

    if (cfg.hasApp) {
      // Front-end SPA — not a published package.
      files[`vite.config.${cfg.ext}`] = [p.import, ``, `import { defineConfig } from 'vite';`, ``, `export default defineConfig({`, `\tplugins: [${p.call}],`, `});`, ``].join('\n');
      pkg.private = true;
      pkg.scripts.dev = 'vite';
      // React/Vue get a type-check before build; Svelte types need svelte-check
      // (heavier), so its app just builds.
      const precheck = cfg.isTs && cfg.isReact ? 'tsc --noEmit && ' : cfg.isTs && cfg.isVue ? 'vue-tsc --noEmit && ' : '';
      pkg.scripts.build = precheck + 'vite build';
      pkg.scripts.preview = 'vite preview';
    } else {
      // Vue component library (lib build + declarations).
      files[`vite.config.${cfg.ext}`] = [
        p.import,
        `import dts from 'vite-plugin-dts';`,
        ``,
        `import { defineConfig } from 'vite';`,
        ``,
        `export default defineConfig({`,
        `\tplugins: [${p.call}, dts({ rollupTypes: true })],`,
        `\tbuild: {`,
        `\t\tlib: { entry: 'src/index.${cfg.ext}', formats: ['es', 'cjs'], fileName: (f) => (f === 'es' ? 'index.js' : 'index.cjs') },`,
        `\t\trollupOptions: { external: ['vue'] },`,
        `\t},`,
        `});`,
        ``,
      ].join('\n');
      pkg.scripts.build = 'vite build';
      pkg.scripts.dev = 'vite build --watch';
      pkg.devDependencies['vite-plugin-dts'] = '^4.0.0';
      if (cfg.isVue) pkg.devDependencies['vue-tsc'] = '^2.0.0';
      // entry points
      pkg.files = ['dist'];
      pkg.type = 'module';
      pkg.main = './dist/index.cjs';
      pkg.module = './dist/index.js';
      pkg.types = './dist/index.d.ts';
      pkg.exports = { '.': { types: './dist/index.d.ts', import: './dist/index.js', require: './dist/index.cjs' } };
    }

    pkg.scripts.clean = 'rimraf dist';
    pkg.devDependencies.rimraf = '^6.0.0';
    return { files, pkg };
  },
};
