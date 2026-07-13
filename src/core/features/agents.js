// AGENTS.md (the emerging cross-tool standard) + CLAUDE.md pointer. Describes
// the stack and the exact commands so coding agents work correctly out of the box.

export default {
  id: 'agents',
  active: (cfg) => cfg.agents,
  apply(cfg) {
    const run = (s) => (cfg.packageManager === 'npm' ? `npm run ${s}` : `${cfg.packageManager} ${s}`);
    const test = cfg.packageManager === 'npm' ? 'npm test' : `${cfg.packageManager} test`;

    const commands = [];
    if (cfg.isTs) commands.push(`- Type-check: \`${run('typecheck')}\``);
    if (cfg.lint !== 'none') commands.push(`- Lint: \`${run('lint')}\``);
    if (cfg.test !== 'none') commands.push(`- Test: \`${test}\``);
    if (cfg.hasBuild) commands.push(`- Build: \`${run('build')}\``);

    const stack = [
      `- Language: ${cfg.isTs ? 'TypeScript (strict)' : 'JavaScript (ESM)'}`,
      `- Module format: ${cfg.moduleFormat.toUpperCase()}`,
      `- Package manager: ${cfg.packageManager}`,
      cfg.bundler !== 'none' ? `- Bundler: ${cfg.bundler}` : `- Build: ${cfg.isTs ? 'tsc' : 'none'}`,
      cfg.test !== 'none' ? `- Tests: ${cfg.test}` : null,
      cfg.lint !== 'none' ? `- Lint/format: ${cfg.lint}` : null,
    ].filter(Boolean);

    const agents = [
      `# AGENTS.md`,
      ``,
      `Guidance for AI coding agents working in **${cfg.name}**.`,
      ``,
      `## Stack`,
      ``,
      ...stack,
      ``,
      `## Commands`,
      ``,
      ...commands,
      ``,
      `## Conventions`,
      ``,
      `- Source lives in \`src/\`. Keep the public API in \`src/index.${cfg.ext}\`.`,
      `- Add or update tests for any behavior change.`,
      cfg.isTs ? `- Prefer explicit types on exported functions; keep \`strict\` passing.` : `- Use ESM syntax and JSDoc types where helpful.`,
      cfg.release === 'changesets' ? `- Run \`npx changeset\` after a user-facing change.` : null,
      `- Do not commit \`dist/\` or \`node_modules/\`.`,
      ``,
    ].filter((l) => l !== null).join('\n');

    return {
      files: {
        'AGENTS.md': agents,
        'CLAUDE.md': `See [AGENTS.md](./AGENTS.md) for build/test commands and conventions.\n`,
      },
      pkg: {},
    };
  },
};
