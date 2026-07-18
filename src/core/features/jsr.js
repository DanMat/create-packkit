import { toJson } from '../render.js';

// JSR publishing (TypeScript-first, ESM-only registry with automatic provenance).
// Publishes source directly — no build step required. JSR names are scoped, so
// a non-scoped package gets an @scope placeholder to fill in.

export default {
  id: 'jsr',
  active: (cfg) => cfg.jsr,
  apply(cfg) {
    const name = cfg.name.startsWith('@') ? cfg.name : `@scope/${cfg.name}`;
    return {
      files: {
        'jsr.json': toJson({
          name,
          version: '0.0.0',
          exports: `./src/index.${cfg.ext}`,
        }),
        '.github/workflows/jsr.yml': [
          'name: Publish to JSR',
          'on:',
          '  push:',
          '    tags: ["v*"]',
          'permissions:',
          '  contents: read',
          '  id-token: write',
          'jobs:',
          '  publish:',
          '    runs-on: ubuntu-latest',
          '    steps:',
          '      - uses: actions/checkout@v7',
          '      - uses: actions/setup-node@v7',
          "        with:",
          "          node-version: '24'",
          '      - run: npx jsr publish',
          '',
        ].join('\n'),
      },
      pkg: {},
    };
  },
};
