#!/usr/bin/env node
import { run } from '../src/cli/index.js';

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
