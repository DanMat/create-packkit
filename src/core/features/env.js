// Type-safe environment-variable validation for server-side runtimes (services
// and CLIs). Validates process.env once at startup with a Zod schema, so a
// misconfigured deploy fails fast with a clear message instead of a surprise
// runtime crash. Ships a matching .env.example.

export default {
  id: 'env',
  active: (cfg) => cfg.env && (cfg.hasService || cfg.hasCli),
  apply(cfg) {
    const files = {};

    files[`src/env.${cfg.ext}`] = cfg.isTs ? envTs() : envJs();
    files['.env.example'] = ['NODE_ENV=development', 'PORT=3000', ''].join('\n');

    return { files, pkg: { dependencies: { zod: '^4.0.0' } } };
  },
};

function envTs() {
  return [
    `import { z } from 'zod';`,
    ``,
    `const schema = z.object({`,
    `\tNODE_ENV: z.enum(['development', 'production', 'test']).default('development'),`,
    `\tPORT: z.coerce.number().default(3000),`,
    `});`,
    ``,
    `const parsed = schema.safeParse(process.env);`,
    `if (!parsed.success) {`,
    `\tconsole.error('❌ Invalid environment variables:', z.treeifyError(parsed.error));`,
    `\tprocess.exit(1);`,
    `}`,
    ``,
    `export const env = parsed.data;`,
    ``,
  ].join('\n');
}

function envJs() {
  return [
    `import { z } from 'zod';`,
    ``,
    `const schema = z.object({`,
    `\tNODE_ENV: z.enum(['development', 'production', 'test']).default('development'),`,
    `\tPORT: z.coerce.number().default(3000),`,
    `});`,
    ``,
    `const parsed = schema.safeParse(process.env);`,
    `if (!parsed.success) {`,
    `\tconsole.error('❌ Invalid environment variables:', z.treeifyError(parsed.error));`,
    `\tprocess.exit(1);`,
    `}`,
    ``,
    `/** @type {z.infer<typeof schema>} */`,
    `export const env = parsed.data;`,
    ``,
  ].join('\n');
}
