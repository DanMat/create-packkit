// size-limit: a bundle-size budget for published libraries. Measures the
// brotli-compressed size of the built entry and fails when it exceeds the
// limit — cheap insurance against a dependency silently bloating the package.
import { toJson } from '../render.js';
import { V } from '../versions.js';

export default {
  id: 'sizelimit',
  active: (cfg) => cfg.sizeLimit,
  apply(cfg) {
    return {
      files: {
        '.size-limit.json': toJson([{ name: cfg.name, path: 'dist/index.js', limit: '10 kB' }]),
      },
      pkg: {
        scripts: { size: 'size-limit' },
        devDependencies: {
          'size-limit': V['size-limit'],
          '@size-limit/preset-small-lib': V['@size-limit/preset-small-lib'],
        },
      },
    };
  },
};
