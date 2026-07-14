// Playwright end-to-end tests for app targets: a config that boots the Vite
// dev server, one smoke spec, the scripts and the dev dependency. The CI job
// lives in workflows.js, which owns all workflow YAML.

const DEV_URL = 'http://localhost:5173'; // Vite's default dev port

const runDev = (cfg) => (cfg.packageManager === 'npm' ? 'npm run dev' : `${cfg.packageManager} dev`);

export default {
  id: 'e2e',
  active: (cfg) => cfg.e2e && cfg.hasApp,
  apply(cfg) {
    const ext = cfg.ext; // 'ts' | 'js' — config/specs never need JSX
    const files = {};
    const pkg = { scripts: {}, devDependencies: { '@playwright/test': '^1.50.0' } };

    files[`playwright.config.${ext}`] = [
      `import { defineConfig, devices } from '@playwright/test';`,
      ``,
      `export default defineConfig({`,
      `\ttestDir: './e2e',`,
      `\tuse: { baseURL: '${DEV_URL}', trace: 'on-first-retry' },`,
      `\t// Playwright starts the app for you and waits for it to be ready.`,
      `\twebServer: {`,
      `\t\tcommand: '${runDev(cfg)}',`,
      `\t\turl: '${DEV_URL}',`,
      `\t\treuseExistingServer: !process.env.CI,`,
      `\t},`,
      `\tprojects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],`,
      `});`,
      ``,
    ].join('\n');

    files[`e2e/app.spec.${ext}`] = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `test('renders the app', async ({ page }) => {`,
      `\tawait page.goto('/');`,
      `\tawait expect(page.getByRole('heading', { name: /Hello from/ })).toBeVisible();`,
      `});`,
      ``,
    ].join('\n');

    pkg.scripts['test:e2e'] = 'playwright test';
    return { files, pkg };
  },
};
