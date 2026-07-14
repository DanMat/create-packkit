// HTTP service target. Supports Hono (default), Fastify and Express. Splits the
// app (testable) from the server entry (which listens), adds start/dev scripts,
// and a production Dockerfile.

export default {
  id: 'service',
  active: (cfg) => cfg.hasService,
  apply(cfg) {
    const ext = cfg.ext;
    const fw = cfg.serviceFramework || 'hono';
    const files = {
      [`src/app.${ext}`]: appFile(cfg, fw),
      [`src/index.${ext}`]: serverFile(cfg, fw),
      Dockerfile: dockerfile(cfg),
      '.dockerignore': ['node_modules', 'dist', 'coverage', '.git', '.github', '.env', '.env.*', '!.env.example', '*.log', 'Dockerfile', '.dockerignore', ''].join('\n'),
    };
    return {
      files,
      pkg: {
        private: true,
        scripts: {
          start: 'node dist/index.js',
          dev: cfg.isTs ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
        },
        dependencies: deps(fw),
        devDependencies: {
          ...(cfg.isTs ? { tsx: '^4.0.0' } : {}),
          ...(cfg.isTs ? typeDeps(fw) : {}),
        },
      },
    };
  },
};

function deps(fw) {
  if (fw === 'fastify') return { fastify: '^5.0.0' };
  if (fw === 'express') return { express: '^5.0.0' };
  return { hono: '^4.5.0', '@hono/node-server': '^2.0.0' };
}

function typeDeps(fw) {
  if (fw === 'express') return { '@types/express': '^5.0.0' };
  return {};
}

function appFile(cfg, fw) {
  if (fw === 'fastify') {
    return [
      `import Fastify from 'fastify';`,
      ``,
      `export const app = Fastify();`,
      ``,
      `app.get('/', async () => ({ ok: true, service: '${cfg.name}' }));`,
      `app.get('/health', async () => 'ok');`,
      ``,
    ].join('\n');
  }
  if (fw === 'express') {
    return [
      `import express from 'express';`,
      ``,
      `export const app = express();`,
      ``,
      `app.get('/', (_req, res) => res.json({ ok: true, service: '${cfg.name}' }));`,
      `app.get('/health', (_req, res) => res.send('ok'));`,
      ``,
    ].join('\n');
  }
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

function serverFile(cfg, fw) {
  const port = cfg.env ? 'env.PORT' : 'Number(process.env.PORT) || 3000';
  const envImport = cfg.env ? `import { env } from './env.js';` : null;

  if (fw === 'fastify') {
    return [
      `import { app } from './app.js';`,
      envImport,
      ``,
      `const port = ${port};`,
      `app.listen({ port, host: '0.0.0.0' }).then((url) => {`,
      `\tconsole.log(\`Listening on \${url}\`);`,
      `}).catch((err) => {`,
      `\tapp.log.error(err);`,
      `\tprocess.exit(1);`,
      `});`,
      ``,
    ].filter((l) => l !== null).join('\n');
  }
  if (fw === 'express') {
    return [
      `import { app } from './app.js';`,
      envImport,
      ``,
      `const port = ${port};`,
      `app.listen(port, () => {`,
      `\tconsole.log(\`Listening on http://localhost:\${port}\`);`,
      `});`,
      ``,
    ].filter((l) => l !== null).join('\n');
  }
  return [
    `import { serve } from '@hono/node-server';`,
    `import { app } from './app.js';`,
    envImport,
    ``,
    `const port = ${port};`,
    `serve({ fetch: app.fetch, port }, (info) => {`,
    `\tconsole.log(\`Listening on http://localhost:\${info.port}\`);`,
    `});`,
    ``,
  ].filter((l) => l !== null).join('\n');
}

function dockerfile(cfg) {
  const node = cfg.nodeVersion;
  const pm = cfg.packageManager;
  const install = pm === 'npm' ? 'npm ci' : `${pm} install --frozen-lockfile`;
  const prune = pm === 'npm' ? 'npm ci --omit=dev' : `${pm} install --prod --frozen-lockfile`;
  const build = pm === 'npm' ? 'npm run build' : `${pm} run build`;
  return [
    `# --- build stage: install everything and compile ---`,
    `FROM node:${node}-slim AS build`,
    `WORKDIR /app`,
    `COPY package*.json ./`,
    `RUN ${install}`,
    `COPY . .`,
    `RUN ${build}`,
    ``,
    `# --- deps stage: production-only node_modules for a smaller image ---`,
    `FROM node:${node}-slim AS deps`,
    `WORKDIR /app`,
    `COPY package*.json ./`,
    `RUN ${prune}`,
    ``,
    `# --- runtime stage: slim, non-root, healthchecked ---`,
    `FROM node:${node}-slim`,
    `WORKDIR /app`,
    `ENV NODE_ENV=production`,
    `COPY --from=deps /app/node_modules ./node_modules`,
    `COPY --from=build /app/dist ./dist`,
    `COPY package.json ./`,
    `USER node`,
    `EXPOSE 3000`,
    `HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`,
    `CMD ["node", "dist/index.js"]`,
    ``,
  ].join('\n');
}
