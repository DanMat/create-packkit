#!/usr/bin/env node
// Thin alias so `npx packkit` runs the create-packkit CLI.
import { run } from 'create-packkit/cli';

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
