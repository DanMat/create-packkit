import * as p from '@clack/prompts';
import { OPTIONS } from '../core/options.js';
import { PRESETS, PRESET_INFO } from '../core/presets.js';

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

  // Fast path: pick a preset and skip the interrogation, or go Custom.
  const start = bail(
    await p.select({
      message: 'Start from a preset, or customize everything?',
      options: [
        { value: '__custom__', label: 'Custom', hint: 'answer all the questions' },
        ...Object.keys(PRESETS).map((k) => ({ value: k, label: k, hint: PRESET_INFO[k] })),
      ],
      initialValue: 'ts-lib',
    }),
  );

  cfg.description = bail(await p.text({ message: 'Description', placeholder: '(optional)', defaultValue: '' }));

  // Preset chosen — merge it under the name/description they typed and we're done.
  if (start !== '__custom__') return { ...PRESETS[start], ...cfg };

  // ---- Custom: the full wizard ----
  cfg.author = bail(await p.text({ message: 'Author', placeholder: '(optional)', defaultValue: seed.author || '' }));
  cfg.language = bail(await p.select({ message: 'Language', options: asOptions('language'), initialValue: OPTIONS.language.default }));
  cfg.framework = bail(await p.select({ message: 'Framework', options: asOptions('framework'), initialValue: OPTIONS.framework.default }));
  cfg.target = bail(await p.multiselect({ message: 'What are you building?', options: asOptions('target'), initialValues: ['library'], required: true }));
  if (!cfg.target.includes('app')) {
    cfg.moduleFormat = bail(await p.select({ message: 'Module format', options: asOptions('moduleFormat'), initialValue: OPTIONS.moduleFormat.default }));
  }
  cfg.packageManager = bail(await p.select({ message: 'Package manager', options: asOptions('packageManager'), initialValue: OPTIONS.packageManager.default }));
  cfg.bundler = bail(await p.select({ message: 'Build / bundler', options: asOptions('bundler'), initialValue: OPTIONS.bundler.default }));
  if (cfg.target.includes('service')) {
    cfg.serviceFramework = bail(await p.select({ message: 'Service framework', options: asOptions('serviceFramework'), initialValue: OPTIONS.serviceFramework.default }));
  }
  cfg.test = bail(await p.select({ message: 'Test runner', options: asOptions('test'), initialValue: OPTIONS.test.default }));
  cfg.lint = bail(await p.select({ message: 'Lint / format', options: asOptions('lint'), initialValue: OPTIONS.lint.default }));
  cfg.gitHooks = bail(await p.select({ message: 'Git hooks', options: asOptions('gitHooks'), initialValue: OPTIONS.gitHooks.default }));
  cfg.release = bail(await p.select({ message: 'Release / versioning', options: asOptions('release'), initialValue: OPTIONS.release.default }));
  cfg.workflows = bail(await p.multiselect({ message: 'GitHub Actions (space to toggle)', options: asOptions('workflows'), initialValues: OPTIONS.workflows.default, required: false }));
  cfg.deps = bail(await p.select({ message: 'Dependency updates', options: asOptions('deps'), initialValue: OPTIONS.deps.default }));
  cfg.license = bail(await p.select({ message: 'License', options: asOptions('license'), initialValue: OPTIONS.license.default }));

  // One screen for all the applicable feature toggles, instead of a dozen
  // yes/no prompts. Options are filtered to what the chosen targets support.
  const isApp = cfg.target.includes('app');
  const isService = cfg.target.includes('service');
  const isCli = cfg.target.includes('cli');
  const isLib = cfg.target.includes('library');
  const componentLib = cfg.framework !== 'none' && isLib && !isApp;
  const publishable = (isLib || isCli) && !isApp && !isService;

  const featOpts = [];
  const on = [];
  const add = (value, label, def = false) => { featOpts.push({ value, label }); if (def) on.push(value); };
  if (cfg.bundler !== 'none') add('minify', 'Minify the build output');
  if (cfg.test !== 'none') add('coverage', 'Coverage reporting', true);
  if (publishable) {
    add('sourcemaps', 'Ship sourcemaps + source (debug into your code)', true);
    add('pkgChecks', 'Package checks (publint + are-the-types-wrong)');
    add('sizeLimit', 'Bundle-size budget (size-limit)');
  }
  if (componentLib) add('storybook', 'Storybook');
  if (isApp) add('e2e', 'Playwright end-to-end tests');
  if (isService || isCli) add('env', 'Type-safe env validation (Zod)');
  if (cfg.release === 'changesets') add('canary', 'Canary / snapshot release workflow');
  add('knip', 'Knip (find unused files / deps / exports)');
  add('doctor', 'Env doctor (warn on Node / package-manager mismatch)');

  const feats = bail(await p.multiselect({ message: 'Optional features (space to toggle, enter to accept)', options: featOpts, initialValues: on, required: false }));
  for (const o of featOpts) cfg[o.value] = feats.includes(o.value);

  const extras = bail(
    await p.multiselect({
      message: 'Repo extras (space to toggle)',
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
