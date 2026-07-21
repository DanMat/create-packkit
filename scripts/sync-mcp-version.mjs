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
