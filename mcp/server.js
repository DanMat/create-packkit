#!/usr/bin/env node
// Packkit MCP server — exposes Packkit scaffolding as Model Context Protocol
// tools so agents (Claude Desktop, Cursor, etc.) can generate projects natively.

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  generate,
  fromPreset,
  normalizeConfig,
  OPTIONS,
  PRESET_INFO,
  PRESET_ALIASES,
} from 'create-packkit/core';

const configFrom = ({ name, preset, options }) => {
  const base = { name, ...(options || {}) };
  return preset ? fromPreset(preset, base) : normalizeConfig(base);
};

const TOOLS = [
  {
    name: 'packkit_schema',
    description:
      'Return every Packkit option, preset, and shortcut alias as JSON. Call this first to learn what can be configured.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'packkit_preview',
    description:
      'Preview the files Packkit would generate for a config, without writing anything. Returns the stack summary and the file tree.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Package name' },
        preset: { type: 'string', description: 'A preset or alias (e.g. ts-lib, react-lib, node-service, rlib)' },
        options: { type: 'object', description: 'Any options from packkit_schema (e.g. { "framework": "vue", "target": ["library"] })' },
      },
      required: ['name'],
    },
  },
  {
    name: 'packkit_scaffold',
    description:
      'Generate a project to disk. Writes files under <directory>/<name> (or ./<name>), optionally runs git init and installs dependencies.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Package name (also the folder name)' },
        preset: { type: 'string', description: 'A preset or alias' },
        options: { type: 'object', description: 'Any options from packkit_schema' },
        directory: { type: 'string', description: 'Parent directory to create the project in (default: current working directory)' },
        install: { type: 'boolean', description: 'Install dependencies (default false)' },
        git: { type: 'boolean', description: 'git init + initial commit (default false)' },
      },
      required: ['name'],
    },
  },
];

const text = (t) => ({ content: [{ type: 'text', text: t }] });
const fail = (t) => ({ content: [{ type: 'text', text: t }], isError: true });

async function writeProject(targetDir, files) {
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(targetDir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, contents);
  }
}

function fileTree(files) {
  return Object.keys(files).sort().map((p) => `  ${p}`).join('\n');
}

const server = new Server({ name: 'packkit', version: '0.1.1' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === 'packkit_schema') {
      return text(JSON.stringify({ options: OPTIONS, presets: PRESET_INFO, aliases: PRESET_ALIASES }, null, 2));
    }

    if (name === 'packkit_preview') {
      const { files, summary } = generate(configFrom(args));
      return text(`Stack: ${summary.stack.join(' · ')}\nFiles (${summary.fileCount}):\n${fileTree(files)}`);
    }

    if (name === 'packkit_scaffold') {
      const config = configFrom(args);
      if (!config.name) return fail('A "name" is required.');
      const parent = args.directory ? resolve(args.directory) : process.cwd();
      const targetDir = join(parent, config.name);
      if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
        return fail(`Target directory "${targetDir}" is not empty.`);
      }
      const { files, summary } = generate(config);
      await writeProject(targetDir, files);

      const steps = [];
      if (args.git) {
        spawnSync('git', ['init', '--quiet'], { cwd: targetDir });
        spawnSync('git', ['add', '-A'], { cwd: targetDir });
        spawnSync('git', ['commit', '-m', 'Initial commit from Packkit', '--quiet'], { cwd: targetDir });
        steps.push('git initialized');
      }
      if (args.install) {
        const ok = spawnSync(config.packageManager, ['install'], { cwd: targetDir }).status === 0;
        steps.push(ok ? 'dependencies installed' : 'install failed (run it manually)');
      }
      return text(
        `Created ${summary.name} at ${targetDir}\n${summary.fileCount} files · ${summary.stack.join(' · ')}` +
          (steps.length ? `\n${steps.join('; ')}` : ''),
      );
    }

    return fail(`Unknown tool: ${name}`);
  } catch (err) {
    return fail(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }
});

await server.connect(new StdioServerTransport());
