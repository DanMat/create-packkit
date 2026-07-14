import * as p from '@clack/prompts';
import { OPTIONS } from '../core/options.js';

function bail(value) {
  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
  return value;
}

const asOptions = (key) => OPTIONS[key].choices.map((c) => ({ value: c.value, label: c.label }));

/** Run the interactive wizard, returning a partial config. `seed` pre-fills. */
export async function runWizard(seed = {}) {
  const cfg = { ...seed };

  cfg.name = bail(
    await p.text({
      message: 'Package name',
      placeholder: 'my-package',
      initialValue: seed.name || '',
      validate: (v) => (!v ? 'Required' : /^(@[\w.-]+\/)?[\w.-]+$/.test(v) ? undefined : 'Invalid npm name'),
    }),
  );

  cfg.description = bail(await p.text({ message: 'Description', placeholder: '(optional)', defaultValue: '' }));
  cfg.author = bail(await p.text({ message: 'Author', placeholder: '(optional)', defaultValue: seed.author || '' }));

  cfg.language = bail(await p.select({ message: 'Language', options: asOptions('language'), initialValue: OPTIONS.language.default }));
  cfg.target = bail(await p.multiselect({ message: 'What are you building?', options: asOptions('target'), initialValues: ['library'], required: true }));
  cfg.moduleFormat = bail(await p.select({ message: 'Module format', options: asOptions('moduleFormat'), initialValue: OPTIONS.moduleFormat.default }));
  cfg.packageManager = bail(await p.select({ message: 'Package manager', options: asOptions('packageManager'), initialValue: OPTIONS.packageManager.default }));
  cfg.bundler = bail(await p.select({ message: 'Build / bundler', options: asOptions('bundler'), initialValue: OPTIONS.bundler.default }));
  if (cfg.bundler !== 'none') {
    cfg.minify = bail(await p.confirm({ message: 'Minify the build output?', initialValue: false }));
  }
  cfg.test = bail(await p.select({ message: 'Test runner', options: asOptions('test'), initialValue: OPTIONS.test.default }));
  if (cfg.target.includes('service')) {
    cfg.serviceFramework = bail(await p.select({ message: 'Service framework', options: asOptions('serviceFramework'), initialValue: OPTIONS.serviceFramework.default }));
  }
  if (cfg.target.includes('app')) {
    cfg.e2e = bail(await p.confirm({ message: 'Add Playwright end-to-end tests?', initialValue: false }));
  }
  cfg.lint = bail(await p.select({ message: 'Lint / format', options: asOptions('lint'), initialValue: OPTIONS.lint.default }));
  cfg.gitHooks = bail(await p.select({ message: 'Git hooks', options: asOptions('gitHooks'), initialValue: OPTIONS.gitHooks.default }));
  if (cfg.target.includes('service') || cfg.target.includes('cli')) {
    cfg.env = bail(await p.confirm({ message: 'Type-safe env validation (Zod)?', initialValue: false }));
  }
  cfg.release = bail(await p.select({ message: 'Release / versioning', options: asOptions('release'), initialValue: OPTIONS.release.default }));
  if (cfg.release === 'changesets') {
    cfg.canary = bail(await p.confirm({ message: 'Add a canary/snapshot release workflow?', initialValue: false }));
  }
  cfg.workflows = bail(await p.multiselect({ message: 'GitHub Actions (space to toggle)', options: asOptions('workflows'), initialValues: OPTIONS.workflows.default, required: false }));
  cfg.deps = bail(await p.select({ message: 'Dependency updates', options: asOptions('deps'), initialValue: OPTIONS.deps.default }));
  cfg.license = bail(await p.select({ message: 'License', options: asOptions('license'), initialValue: OPTIONS.license.default }));

  const extras = bail(
    await p.multiselect({
      message: 'Extras (space to toggle)',
      options: [
        { value: 'community', label: 'Community files (CONTRIBUTING, CoC, SECURITY, templates)' },
        { value: 'agents', label: 'AI agent instructions (AGENTS.md + CLAUDE.md)' },
        { value: 'vscode', label: 'VS Code settings' },
        { value: 'editorconfig', label: '.editorconfig' },
      ],
      initialValues: ['community', 'agents', 'vscode', 'editorconfig'],
      required: false,
    }),
  );
  for (const key of ['community', 'agents', 'vscode', 'editorconfig']) cfg[key] = extras.includes(key);

  return cfg;
}
