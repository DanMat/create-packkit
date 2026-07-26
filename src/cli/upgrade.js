// `packkit upgrade` — regenerate a scaffolded project's current recommended
// output and report (or apply) what has drifted from Packkit's templates.
//
// It reads packkit.json to learn the preset + settings the project came from,
// regenerates in memory through the embedded API, and diffs against disk. New
// files and package.json dep/script updates apply cleanly; files that differ
// are surfaced for review, never overwritten unless explicitly forced.

import { parseArgs } from 'node:util';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createProject, planUpgrade, isUpgradeEmpty, buildUpgradeWrite } from '../embedded/index.js';
import { writeGeneratedProject } from '../embedded/writer.js';

const UPGRADE_HELP = `
packkit upgrade — pull your project up to Packkit's current templates

Usage:
  packkit upgrade [directory] [options]

Reads packkit.json in the directory (default: current), regenerates the project
Packkit would produce today, and shows what changed since you scaffolded.

Options:
  --apply        Write new files and update package.json / packkit.json
  --force        With --apply, also overwrite files that differ (review first!)
  -h, --help     Show this help

Without --apply this is a dry run — it only reports.
`;

export async function runUpgrade(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      apply: { type: 'boolean' },
      force: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) return void console.log(UPGRADE_HELP);

  const dir = resolve(positionals[0] || '.');
  const provPath = join(dir, 'packkit.json');
  if (!existsSync(provPath)) {
    console.error(`No packkit.json in "${dir}". Upgrade only works on a project Packkit scaffolded.`);
    process.exit(1);
  }

  let provenance;
  try {
    provenance = JSON.parse(readFileSync(provPath, 'utf8'));
  } catch (err) {
    console.error(`Could not read packkit.json: ${err.message}`);
    process.exit(1);
  }

  // The project name isn't a "setting", so it lives in package.json, not
  // packkit.json — read it back so regeneration reproduces the same names.
  const name = readName(dir) || provenance.name || 'my-package';
  const fromVersion = provenance.version || 'unknown';

  let project;
  try {
    project = createProject({ preset: provenance.preset, name, config: provenance.settings || {} });
  } catch (err) {
    console.error(`Could not regenerate from packkit.json: ${err.message}`);
    process.exit(1);
  }
  const toVersion = project.metadata.packkitVersion;

  const onDisk = {};
  for (const path of Object.keys(project.files)) {
    const full = join(dir, path);
    onDisk[path] = existsSync(full) ? readFileSync(full, 'utf8') : undefined;
  }

  const plan = planUpgrade({ generated: project.files, onDisk });

  if (isUpgradeEmpty(plan)) {
    console.log(`Already current with Packkit ${toVersion}. Nothing to upgrade.`);
    return;
  }

  report(plan, fromVersion, toVersion);

  if (!values.apply) {
    console.log('\nThis was a dry run. Re-run with --apply to bring in the safe changes.');
    return;
  }

  const writeMap = buildUpgradeWrite({ generated: project.files, onDisk, plan, includeChanged: !!values.force });
  const paths = Object.keys(writeMap);
  if (paths.length) {
    await writeGeneratedProject({
      project: { config: project.config, files: writeMap },
      destination: dir,
      collisionPolicy: 'overwrite',
    });
    console.log(`\n✓ Applied ${paths.length} file update${paths.length > 1 ? 's' : ''}.`);
  }
  const leftover = values.force ? [] : plan.files.changed;
  if (leftover.length) {
    const plural = leftover.length > 1;
    console.log(
      `\n${leftover.length} file${plural ? 's' : ''} ${plural ? 'differ' : 'differs'} from the current template and ` +
        `${plural ? 'were' : 'was'} left untouched (they may be your edits):\n  ` +
        leftover.join('\n  ') +
        `\nReview them, then re-run with --force to overwrite the ones you want Packkit's version of.`,
    );
  }
}

function readName(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name;
  } catch {
    return null;
  }
}

function report(plan, fromVersion, toVersion) {
  console.log(`Packkit ${fromVersion} → ${toVersion}\n`);
  const p = plan.packageJson;

  if (plan.files.added.length) {
    console.log(`New files (${plan.files.added.length}):\n  ` + plan.files.added.join('\n  '));
  }
  const addedDeps = Object.entries(p.addedDependencies);
  const bumpedDeps = Object.entries(p.updatedDependencies);
  if (addedDeps.length) {
    console.log(`\nNew dependencies (${addedDeps.length}):\n  ` + addedDeps.map(([n, d]) => `${n}@${d.version} (${d.map})`).join('\n  '));
  }
  if (bumpedDeps.length) {
    console.log(`\nDependency updates (${bumpedDeps.length}):\n  ` + bumpedDeps.map(([n, d]) => `${n}: ${d.from} → ${d.to}`).join('\n  '));
  }
  const addedScripts = Object.keys(p.addedScripts);
  const changedScripts = Object.entries(p.changedScripts);
  if (addedScripts.length) console.log(`\nNew scripts (${addedScripts.length}):\n  ` + addedScripts.join('\n  '));
  if (changedScripts.length) {
    console.log(`\nScript changes (${changedScripts.length}):\n  ` + changedScripts.map(([n, d]) => `${n}: ${d.from} → ${d.to}`).join('\n  '));
  }
  if (plan.files.changed.length) {
    console.log(`\nFiles that differ — review before overwriting (${plan.files.changed.length}):\n  ` + plan.files.changed.join('\n  '));
  }
}
