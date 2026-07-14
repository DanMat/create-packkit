// Storybook for component libraries (React / Vue / Svelte), on the Vite builder.

const FW = {
  react: { builder: '@storybook/react-vite', renderer: '@storybook/react', storyExt: 'tsx' },
  vue: { builder: '@storybook/vue3-vite', renderer: '@storybook/vue3', storyExt: 'ts' },
  svelte: { builder: '@storybook/svelte-vite', renderer: '@storybook/svelte', storyExt: 'ts' },
};

export default {
  id: 'storybook',
  active: (cfg) => cfg.storybook,
  apply(cfg) {
    const fw = FW[cfg.framework];
    const files = {};

    files['.storybook/main.ts'] = [
      `import type { StorybookConfig } from '${fw.builder}';`,
      ``,
      `const config: StorybookConfig = {`,
      `\tstories: ['../src/**/*.stories.@(ts|tsx|svelte)'],`,
      `\taddons: [],`,
      `\tframework: '${fw.builder}',`,
      `};`,
      `export default config;`,
      ``,
    ].join('\n');

    files['.storybook/preview.ts'] = `export default { parameters: {} };\n`;

    files[`src/Button.stories.${fw.storyExt}`] = story(cfg, fw);

    return {
      files,
      pkg: {
        scripts: {
          storybook: 'storybook dev -p 6006',
          'build-storybook': 'storybook build',
        },
        devDependencies: {
          storybook: '^10.0.0',
          [fw.builder]: '^10.0.0',
          [fw.renderer]: '^10.0.0',
          vite: '^8.0.0',
        },
      },
    };
  },
};

function story(cfg, fw) {
  if (cfg.isReact) {
    return [
      `import type { Meta, StoryObj } from '${fw.renderer}';`,
      `import { Button } from './index';`,
      ``,
      `const meta: Meta<typeof Button> = { component: Button };`,
      `export default meta;`,
      ``,
      `export const Default: StoryObj<typeof Button> = { args: { label: 'Click me' } };`,
      ``,
    ].join('\n');
  }
  if (cfg.isVue) {
    return [
      `import type { Meta, StoryObj } from '${fw.renderer}';`,
      `import { Button } from './index';`,
      ``,
      `const meta = { component: Button } satisfies Meta<typeof Button>;`,
      `export default meta;`,
      ``,
      `export const Default: StoryObj<typeof meta> = { args: { label: 'Click me' } };`,
      ``,
    ].join('\n');
  }
  // svelte
  return [
    `import type { Meta, StoryObj } from '${fw.renderer}';`,
    `import Button from './Button.svelte';`,
    ``,
    `const meta = { component: Button } satisfies Meta<Button>;`,
    `export default meta;`,
    ``,
    `export const Default: StoryObj<typeof meta> = { args: { label: 'Click me' } };`,
    ``,
  ].join('\n');
}
