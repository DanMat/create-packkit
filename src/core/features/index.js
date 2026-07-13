// Feature registry. Order matters only for how package.json fragments merge
// (later features deep-merge over earlier ones); files are keyed by path.

import meta from './meta.js';
import bundler from './bundler.js';
import typescript from './typescript.js';
import test from './test.js';
import lint from './lint.js';
import githooks from './githooks.js';
import release from './release.js';
import cli from './cli.js';
import workflows from './workflows.js';
import community from './community.js';
import agents from './agents.js';
import vscode from './vscode.js';
import gitfiles from './gitfiles.js';

export default [
  meta,
  bundler,
  typescript,
  test,
  lint,
  githooks,
  release,
  cli,
  workflows,
  community,
  agents,
  vscode,
  gitfiles,
];
