#!/usr/bin/env node
// Keep the MCP server's version consistent across the three places it appears:
//
//   mcp/package.json  → the published npm version (source of truth)
//   server.json       → the official-registry entry + the npm version it points at
//   mcp/server.js     → the version the server advertises in its MCP handshake
//
// Run after anything changes mcp/package.json's version. The release workflow
// does this automatically; `npm run sync:mcp` does it by hand.
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('mcp/package.json', 'utf8'));
const version = pkg.version;

// The registry verifies npm-package ownership by matching this field against
// server.json's name, so a mismatch fails the publish — catch it here instead.
const server = JSON.parse(readFileSync('server.json', 'utf8'));
if (pkg.mcpName !== server.name) {
  console.error(
    `mcpName mismatch: mcp/package.json "${pkg.mcpName}" !== server.json "${server.name}".\n` +
      'The MCP registry uses this to verify you own the npm package; they must match exactly (case-sensitive).',
  );
  process.exit(1);
}

const changed = [];

server.version = version;
if (Array.isArray(server.packages) && server.packages[0]) {
  server.packages[0].version = version;
}
const serverJson = JSON.stringify(server, null, 2) + '\n';
if (serverJson !== readFileSync('server.json', 'utf8')) {
  writeFileSync('server.json', serverJson);
  changed.push('server.json');
}

const entry = 'mcp/server.js';
const src = readFileSync(entry, 'utf8');
const next = src.replace(/(name: 'packkit', version: ')[^']*(')/, `$1${version}$2`);
if (next === src && !src.includes(`version: '${version}'`)) {
  console.error(`Could not find the Server({ name: 'packkit', version: '…' }) call in ${entry}.`);
  process.exit(1);
}
if (next !== src) {
  writeFileSync(entry, next);
  changed.push(entry);
}

console.log(
  changed.length ? `Synced to ${version}: ${changed.join(', ')}` : `Already in sync at ${version}.`,
);

// packkit-mcp imports from create-packkit (`create-packkit/scaffold`), so a
// release whose version falls outside the range mcp declares would publish an
// MCP server that cannot install. Caught here — before anything is published —
// rather than as a confusing resolution error at the end of the release.
const range = pkg.dependencies?.['create-packkit'];
const rootVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
if (range && !satisfiesCaret(range, rootVersion)) {
  console.error(
    `\npackkit-mcp requires create-packkit "${range}", but this repo is at ${rootVersion}.\n` +
      `The next release must be large enough to satisfy it (a minor bump if the floor is a new minor),\n` +
      `or lower the range in mcp/package.json.`,
  );
  process.exit(1);
}

/** Minimal `^X.Y.Z` check — the only range style this repo uses. */
function satisfiesCaret(range, version) {
  const m = /^\^?(\d+)\.(\d+)\.(\d+)/.exec(range);
  const v = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m || !v) return true; // unrecognised range — don't block the release
  const [, rMaj, rMin, rPat] = m.map(Number);
  const [, vMaj, vMin, vPat] = v.map(Number);
  if (vMaj !== rMaj) return false;
  return vMin > rMin || (vMin === rMin && vPat >= rPat);
}
