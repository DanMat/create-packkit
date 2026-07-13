// HTTP service target (Hono). Splits the app (testable) from the server entry
// (which listens), adds start/dev scripts, and a Dockerfile.

export default {
  id: 'service',
  active: (cfg) => cfg.hasService,
  apply(cfg) {
    const ext = cfg.ext;
    const files = {
      [`src/app.${ext}`]: appFile(cfg),
      [`src/index.${ext}`]: serverFile(cfg),
      Dockerfile: dockerfile(cfg),
      '.dockerignore': 'node_modules\ndist\n.git\n.env\n',
    };
    return {
      files,
      pkg: {
        private: true,
        scripts: {
          start: 'node dist/index.js',
          dev: cfg.isTs ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
        },
        dependencies: { hono: '^4.5.0', '@hono/node-server': '^1.12.0' },
        ...(cfg.isTs ? { devDependencies: { tsx: '^4.0.0' } } : {}),
      },
    };
  },
};

function appFile(cfg) {
  const t = cfg.isTs;
  return [
    `import { Hono } from 'hono';`,
    ``,
    `export const app = new Hono();`,
    ``,
    `app.get('/', (c) => c.json({ ok: true, service: '${cfg.name}' }));`,
    `app.get('/health', (c) => c.text('ok'));`,
    ``,
  ].join('\n');
}

function serverFile(cfg) {
  return [
    `import { serve } from '@hono/node-server';`,
    `import { app } from './app${cfg.isTs ? '.js' : '.js'}';`,
    ``,
    `const port = Number(process.env.PORT) || 3000;`,
    `serve({ fetch: app.fetch, port }, (info) => {`,
    `\tconsole.log(\`Listening on http://localhost:\${info.port}\`);`,
    `});`,
    ``,
  ].join('\n');
}

function dockerfile(cfg) {
  const node = cfg.nodeVersion;
  const pm = cfg.packageManager;
  const install = pm === 'npm' ? 'npm ci' : `${pm} install --frozen-lockfile`;
  const build = pm === 'npm' ? 'npm run build' : `${pm} run build`;
  return [
    `FROM node:${node}-slim AS build`,
    `WORKDIR /app`,
    `COPY package*.json ./`,
    `RUN ${install}`,
    `COPY . .`,
    `RUN ${build}`,
    ``,
    `FROM node:${node}-slim`,
    `WORKDIR /app`,
    `ENV NODE_ENV=production`,
    `COPY --from=build /app/node_modules ./node_modules`,
    `COPY --from=build /app/dist ./dist`,
    `COPY package.json ./`,
    `EXPOSE 3000`,
    `CMD ["node", "dist/index.js"]`,
    ``,
  ].join('\n');
}
