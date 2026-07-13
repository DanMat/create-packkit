// .gitignore, .editorconfig, .npmrc — always-on repo hygiene.

const GITIGNORE = `# dependencies
node_modules/
.pnp.*
.yarn/*

# build output
dist/
coverage/
*.tsbuildinfo

# logs
*.log
npm-debug.log*

# env & editor
.env
.env.*
!.env.example
.DS_Store
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
`;

const EDITORCONFIG = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = tab

[*.{json,yml,yaml,md}]
indent_style = space
indent_size = 2
`;

export default {
  id: 'gitfiles',
  active: () => true,
  apply(cfg) {
    const files = { '.gitignore': GITIGNORE };
    if (cfg.editorconfig) files['.editorconfig'] = EDITORCONFIG;
    return { files, pkg: {} };
  },
};
