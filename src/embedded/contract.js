// Provider-neutral deployment contract.
//
// A host application deploying a generated project needs to know how to build
// and run it — but Packkit must not know or care whether that host is Vercel,
// a Kubernetes cluster, or a Raspberry Pi. So this describes build/runtime
// requirements in provider-agnostic terms, derived purely from the resolved
// config. No AWS/Netlify/Vercel/Cloudflare/GitHub fields, by design.

/**
 * Derive the deployment contract from a resolved config.
 * @returns {import('./index.js').DeploymentContract}
 */
export function deriveDeploymentContract(cfg) {
  const run = (script) => (cfg.packageManager === 'npm' ? `npm run ${script}` : `${cfg.packageManager} ${script}`);
  const start = cfg.packageManager === 'npm' ? 'npm start' : `${cfg.packageManager} start`;

  if (cfg.hasService) {
    return prune({
      type: 'node-service',
      buildCommand: cfg.hasBuild ? run('build') : undefined,
      startCommand: start,
      port: 3000,
      healthCheckPath: '/health',
      requiredEnvironmentVariables: cfg.env ? ['PORT'] : [],
    });
  }

  if (cfg.hasApp) {
    return prune({
      type: 'static',
      buildCommand: run('build'),
      // Vite's default build output.
      outputDirectory: 'dist',
    });
  }

  if (cfg.hasCli) {
    return prune({
      type: 'cli',
      buildCommand: cfg.hasBuild ? run('build') : undefined,
    });
  }

  return prune({
    type: 'library',
    buildCommand: cfg.hasBuild ? run('build') : undefined,
  });
}

// Drop undefined fields and empty required-env arrays so the contract stays
// minimal and deterministic — the same config always yields the same object.
function prune(contract) {
  const out = {};
  for (const [k, v] of Object.entries(contract)) {
    if (v === undefined) continue;
    if (k === 'requiredEnvironmentVariables' && Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}
