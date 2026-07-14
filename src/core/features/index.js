// Feature registry. Order matters only for how package.json fragments merge
// (later features deep-merge over earlier ones); files are keyed by path.

import meta from './meta.js';
import bundler from './bundler.js';
import typescript from './typescript.js';
import frameworks from './frameworks.js';
import vite from './vite.js';
import service from './service.js';
import test from './test.js';
import e2e from './e2e.js';
import lint from './lint.js';
import githooks from './githooks.js';
import release from './release.js';
import cli from './cli.js';
import checks from './checks.js';
import jsr from './jsr.js';
import workflows from './workflows.js';
import storybook from './storybook.js';
import community from './community.js';
import agents from './agents.js';
import vscode from './vscode.js';
import gitfiles from './gitfiles.js';

export default [
  meta,
  bundler,
  typescript,
  frameworks,
  vite,
  service,
  test,
  e2e,
  lint,
  githooks,
  release,
  cli,
  checks,
  jsr,
  workflows,
  storybook,
  community,
  agents,
  vscode,
  gitfiles,
];
