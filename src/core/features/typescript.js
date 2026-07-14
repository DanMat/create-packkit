import { toJson } from '../render.js';

export default {
  id: 'typescript',
  active: (cfg) => cfg.isTs,
  apply(cfg) {
    const noBuild = cfg.bundler === 'none' && !cfg.customBuild;
    const webLibs = cfg.hasFramework || cfg.hasApp;
    const compilerOptions = {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: webLibs ? ['ES2022', 'DOM', 'DOM.Iterable'] : ['ES2022'],
      ...(cfg.isReact ? { jsx: 'react-jsx' } : {}),
      strict: true,
      noUncheckedIndexedAccess: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      verbatimModuleSyntax: cfg.bundler !== 'none' && !cfg.hasFramework,
      declaration: true,
      // Declaration maps let editors jump from the published .d.ts into the
      // shipped .ts source (the bundler emits JS sourcemaps to match).
      ...(cfg.sourcemaps ? { declarationMap: true } : {}),
    };
    if (noBuild) {
      // tsc is the build: emit to dist.
      compilerOptions.moduleResolution = 'NodeNext';
      compilerOptions.module = 'NodeNext';
      compilerOptions.outDir = 'dist';
      compilerOptions.rootDir = 'src';
      if (cfg.sourcemaps) compilerOptions.sourceMap = true;
    } else {
      compilerOptions.noEmit = true;
    }

    return {
      files: {
        'tsconfig.json': toJson({
          $schema: 'https://json.schemastore.org/tsconfig',
          compilerOptions,
          include: ['src'],
          exclude: ['dist', 'node_modules'],
        }),
      },
      pkg: {
        devDependencies: {
          typescript: '^5.9.3',
          '@types/node': `^${cfg.nodeVersion}.0.0`,
        },
      },
    };
  },
};
