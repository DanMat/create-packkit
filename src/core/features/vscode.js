import { toJson } from '../render.js';

export default {
  id: 'vscode',
  active: (cfg) => cfg.vscode,
  apply(cfg) {
    const biome = cfg.lint === 'biome';
    const settings = {
      'editor.formatOnSave': cfg.lint !== 'none',
      'editor.defaultFormatter': biome ? 'biomejs.biome' : 'esbenp.prettier-vscode',
      'editor.insertSpaces': false,
    };
    if (cfg.lint === 'eslint-prettier' || cfg.lint === 'oxlint') {
      settings['editor.codeActionsOnSave'] = { 'source.fixAll': 'explicit' };
    }

    const recommendations = [];
    if (biome) recommendations.push('biomejs.biome');
    else {
      if (cfg.lint === 'eslint-prettier') recommendations.push('dbaeumer.vscode-eslint');
      if (cfg.lint !== 'none') recommendations.push('esbenp.prettier-vscode');
    }
    if (cfg.test === 'vitest') recommendations.push('vitest.explorer');

    return {
      files: {
        '.vscode/settings.json': toJson(settings),
        '.vscode/extensions.json': toJson({ recommendations }),
      },
      pkg: {},
    };
  },
};
