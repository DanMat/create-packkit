import { resolve, basename } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import { generate, fromPreset, normalizeConfig, PRESET_NAMES, OPTIONS, PRESET_INFO, PRESET_ALIASES } from '../core/index.js';
import { nodeFloor, meetsNodeFloor } from '../core/node.js';
import { parseCliArgs } from './args.js';
import { runWizard } from './wizard.js';
import { writeProject, dirIsEmptyOrMissing, gitInit, installDeps } from './write.js';

const pkgVersion = () => {
  try {
    const url = new URL('../../package.json', import.meta.url);
    return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
};

const HELP = `
packkit — scaffold a modern npm package or CLI

Usage:
  npm create packkit@latest [name] [options]
  npx packkit [preset] [name] [options]

Presets: ${PRESET_NAMES.join(', ')}

Options:
  --preset <name>     Use a preset (skips the wizard)
  --from <file>       Load defaults from a JSON profile (or packkit.config.json)
  --name <name>       Package name
  --here              Scaffold into the current directory
  -y, --yes           Accept defaults / preset, no prompts (one-shot)
  --recommended       Alias for --yes — recommended defaults in one command
  --monorepo          Generate a pnpm/Turborepo workspace
  --no-install        Skip dependency install
  --no-git            Skip git init
  --pm <manager>      npm | pnpm | yarn | bun
  --language <ts|js>  --module <esm|cjs|dual>  --framework <none|react|vue|svelte>
  --target <library|cli|service|app>   (repeatable)   --storybook
  --bundler <tsup|tsdown|unbuild|rollup|none>   --minify
  --test <vitest|jest|node|none>  --lint <eslint-prettier|biome|oxlint|none>
  --hooks <simple-git-hooks|husky|lefthook|none>  --release <changesets|release-it|np|none>
  --workflows <ci|npm-publish|pages|codeql|codecov|stale>   (repeatable)
  --deps <renovate|dependabot|none>  --license <MIT|Apache-2.0|ISC|none>
  --pkg-checks (publint + are-the-types-wrong)   --knip   --jsr
  --no-coverage  --no-community  --no-agents  --no-vscode  --no-editorconfig
  --schema            Print the full option/preset schema as JSON (for tools/agents)
  -h, --help          Show this help
  -v, --version       Show version

Preset shortcuts: lib, jslib, rlib, rapp, vlib, vapp, slib, sapp, svc

Examples:
  npx packkit ts-lib my-lib
  npm create packkit@latest my-cli -- --preset cli
  npx packkit --preset full my-pkg --pm pnpm
`;

export async function run(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  if (args.help) return void console.log(HELP);
  if (args.version) return void console.log(pkgVersion());
  if (args.schema) {
    // Machine-readable interface for tools/agents: every option, preset, and alias.
    return void console.log(JSON.stringify({ version: pkgVersion(), options: OPTIONS, presets: PRESET_INFO, aliases: PRESET_ALIASES }, null, 2));
  }

  // Only prompt when the user gave nothing to go on — a preset, --yes, a
  // profile, or any config flag makes it a one-shot.
  const interactive = !args.preset && !args.yes && !args.from && !args.hasConfigFlags && process.stdout.isTTY;

  // Precedence: preset < profile file < CLI flags.
  const profile = loadProfile(args);
  const seed = { ...profile, ...args.overrides };

  let config;
  if (interactive) {
    p.intro('📦 Packkit');
    config = normalizeConfig(await runWizard(seed));
  } else if (args.preset) {
    config = fromPreset(args.preset, seed);
  } else {
    config = normalizeConfig(seed);
  }

  config.gitInit = args.git;
  config.install = args.install;

  // Node preflight: the generated project's tools (eslint, vite, vitest) hard-
  // require this floor. npm only *warns* on engines, so catch it here — clearly,
  // once — instead of letting a doomed install spew EBADENGINE and leave a broken
  // project. This is the signal both humans and agents need up front.
  const floor = nodeFloor(config.nodeVersion);
  const nodeOk = meetsNodeFloor(process.version, floor);
  if (!nodeOk) {
    const lines = [
      `Node ${process.version} is below this project's required Node >= ${floor}.`,
      `Tools like eslint, vite and vitest will not run on it.`,
      `Fix: nvm install ${config.nodeVersion}   (or install any Node >= ${floor})`,
    ];
    if (config.install) {
      lines.push(`Skipping the dependency install until Node is upgraded.`);
      config.install = false;
    }
    if (interactive) p.log.warn(lines.join('\n')); else console.error('\n⚠  ' + lines.join('\n   '));
  }

  // Resolve the target directory.
  const targetDir = args.here ? process.cwd() : resolve(process.cwd(), config.name);
  if (!args.here && !config.name) {
    console.error('A package name is required (pass one, or run interactively).');
    process.exit(1);
  }
  if (!dirIsEmptyOrMissing(targetDir)) {
    console.error(`Target directory "${basename(targetDir)}" is not empty. Aborting.`);
    process.exit(1);
  }

  // Generate + write.
  const { files, summary } = generate(config);
  await writeProject(targetDir, files);

  // Post steps.
  if (config.gitInit) gitInit(targetDir);
  if (config.install) {
    const s = p.spinner();
    s.start(`Installing dependencies with ${config.packageManager}`);
    const ok = installDeps(config.packageManager, targetDir);
    s.stop(ok ? 'Dependencies installed' : 'Install skipped (run it manually)');
  }

  const rel = args.here ? '.' : config.name;
  const next = [
    args.here ? null : `cd ${rel}`,
    config.install ? null : `${config.packageManager} install`,
    config.hasApp ? `${runWord(config)} dev` : config.hasBuild ? `${runWord(config)} build` : null,
    config.test !== 'none' ? `${runWord(config)} test` : null,
  ].filter(Boolean);

  // Clarify things that surprise people: a framework *library* has no dev
  // server (its `dev` just rebuilds), and the Node floor this project needs.
  const componentLib = config.hasFramework && config.hasLibrary && !config.hasApp;
  const hints = [
    componentLib
      ? `This is a ${config.framework} component library — \`${runWord(config)} dev\` rebuilds on change (there's no dev server). For a runnable app, scaffold the "${config.framework}-app" preset instead.`
      : null,
    `Requires Node >= ${floor}${nodeOk ? '' : ` — you're on ${process.version}, upgrade first`}.`,
  ].filter(Boolean);

  const done = `Created ${summary.name} — ${summary.fileCount} files · ${summary.stack.join(' · ')}`;
  if (interactive) {
    p.note(next.join('\n') || 'You are all set.', 'Next steps');
    if (hints.length) p.log.info(hints.join('\n'));
    p.outro(done);
  } else {
    console.log(done);
    if (next.length) console.log('\nNext steps:\n  ' + next.join('\n  '));
    if (hints.length) console.log('\n' + hints.map((h) => '• ' + h).join('\n'));
  }

  const latest = await checkForUpdate(pkgVersion());
  if (latest) console.log(`\n↑ A newer create-packkit is available: ${latest} (you have ${pkgVersion()}). Use @latest to update.`);
}

function runWord(config) {
  return config.packageManager === 'npm' ? 'npm run' : config.packageManager;
}

// Load a partial config from --from <file>, or a packkit.config.json in cwd.
function loadProfile(args) {
  const path = args.from || (existsSync('packkit.config.json') ? 'packkit.config.json' : null);
  if (!path) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Could not read profile "${path}": ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

// Best-effort update check — TTY only, short timeout, never throws or blocks.
async function checkForUpdate(current) {
  try {
    if (process.env.CI || process.env.NO_UPDATE_NOTIFIER || !process.stdout.isTTY) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('https://registry.npmjs.org/create-packkit/latest', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const { version } = await res.json();
    return version && isNewer(version, current) ? version : null;
  } catch {
    return null;
  }
}

function isNewer(latest, current) {
  const a = latest.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}
