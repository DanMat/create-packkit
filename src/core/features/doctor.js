// A tiny environment doctor: checks the local Node and package manager match
// what this project expects, and warns (never fails) otherwise. `npm run doctor`
// runs it any time; for private projects it also runs on postinstall. It is NOT
// wired to postinstall for publishable packages — that would run in every
// consumer's install.

export default {
  id: 'doctor',
  active: (cfg) => cfg.doctor && !cfg.monorepo,
  apply(cfg) {
    const files = { 'scripts/doctor.mjs': script(cfg) };
    const pkg = { scripts: { doctor: 'node scripts/doctor.mjs' } };
    if (!cfg.publishable) pkg.scripts.postinstall = 'node scripts/doctor.mjs';
    return { files, pkg };
  },
};

function script(cfg) {
  return [
    `/* global process, console, URL */`,
    `// Checks your environment matches this project. Warns only — never fails.`,
    `import { readFileSync } from 'node:fs';`,
    ``,
    `const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));`,
    `const gte = (a, b) => {`,
    `\tconst pa = String(a).split('.').map(Number);`,
    `\tconst pb = String(b).split('.').map(Number);`,
    `\tfor (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);`,
    `\treturn true;`,
    `};`,
    ``,
    `let issues = 0;`,
    `const floor = (pkg.engines?.node || '').replace(/[^0-9.]/g, '');`,
    `const node = process.versions.node;`,
    `if (floor && !gte(node, floor)) {`,
    "\tconsole.warn(`⚠  Node ${node} is below the required >=${floor} — run: nvm install ${floor.split('.')[0]}`);",
    `\tissues++;`,
    `} else {`,
    "\tconsole.log(`✓ Node ${node}`);",
    `}`,
    ``,
    `const expectedPm = '${cfg.packageManager}';`,
    `const usingPm = (process.env.npm_config_user_agent || '').split('/')[0];`,
    `if (usingPm && usingPm !== expectedPm) {`,
    "\tconsole.warn(`⚠  This project uses ${expectedPm}, but you ran ${usingPm}.`);",
    `\tissues++;`,
    `} else {`,
    "\tconsole.log(`✓ Package manager: ${expectedPm}`);",
    `}`,
    ``,
    `if (issues) console.warn('\\nSee the README "Requirements" section to fix these.');`,
    ``,
  ].join('\n');
}
