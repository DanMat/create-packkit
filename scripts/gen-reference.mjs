// Regenerates the Options + Presets reference tables in README.md from the
// schema (src/core/options.js + presets.js), so the docs never drift. Run:
//   node scripts/gen-reference.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OPTIONS, GROUPS, OPTION_HELP } from '../src/core/options.js';
import { PRESET_INFO, PRESET_ALIASES } from '../src/core/presets.js';

// option key -> CLI flag (only the ones that differ from --kebab-case)
const FLAG = {
  moduleFormat: '--module', gitHooks: '--hooks', serviceFramework: '--server',
  packageManager: '--pm', nodeVersion: '--node', sizeLimit: '--size-limit', pkgChecks: '--pkg-checks',
  gitInit: '--no-git', install: '--no-install',
};
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const flagFor = (k, opt) => {
  if (FLAG[k]) return FLAG[k];
  if (opt.type === 'boolean' && opt.default === true) return `--no-${kebab(k)}`;
  return `--${kebab(k)}`;
};

function values(opt) {
  if (opt.type === 'text') return '—';
  if (opt.type === 'boolean') return `on / off (default: **${opt.default ? 'on' : 'off'}**)`;
  const def = opt.default;
  return opt.choices
    .map((c) => {
      const isDef = Array.isArray(def) ? def.includes(c.value) : c.value === def;
      return isDef ? `**${c.value}**` : c.value;
    })
    .join(' · ');
}

function optionsTable() {
  const out = [];
  for (const g of GROUPS) {
    const keys = Object.keys(OPTIONS).filter((k) => OPTIONS[k].group === g.id);
    if (!keys.length) continue;
    out.push(`### ${g.label}`, '', '| Flag | Values | What it does |', '|---|---|---|');
    for (const k of keys) {
      const opt = OPTIONS[k];
      const help = (OPTION_HELP[k] || opt.label).replace(/\|/g, '\\|');
      out.push(`| \`${flagFor(k, opt)}\` | ${values(opt)} | ${help} |`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

function presetsTable() {
  const alias = {};
  for (const [a, name] of Object.entries(PRESET_ALIASES)) (alias[name] ||= []).push(a);
  const rows = ['| Preset | Shortcut | What you get |', '|---|---|---|'];
  for (const [name, info] of Object.entries(PRESET_INFO)) {
    rows.push(`| \`${name}\` | ${alias[name] ? '`' + alias[name].join('`, `') + '`' : '—'} | ${info} |`);
  }
  return rows.join('\n');
}

function inject(md, marker, body) {
  const re = new RegExp(`(<!-- ${marker}:START -->)[\\s\\S]*?(<!-- ${marker}:END -->)`);
  if (!re.test(md)) throw new Error(`Missing ${marker} markers in README.md`);
  return md.replace(re, `$1\n\n${body}\n\n$2`);
}

const readme = fileURLToPath(new URL('../README.md', import.meta.url));
let md = readFileSync(readme, 'utf8');
md = inject(md, 'OPTIONS', optionsTable());
md = inject(md, 'PRESETS', presetsTable());
writeFileSync(readme, md);
console.log('README reference regenerated.');
