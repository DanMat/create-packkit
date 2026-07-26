// Public types for the writer (create-packkit/writer).

import type { GeneratedProject, Diagnostic, CollisionPolicy } from './embedded.js';

export interface WriteGeneratedProjectInput {
  project: GeneratedProject;
  destination: string;
  collisionPolicy?: CollisionPolicy;
}

export interface WriteResult {
  destination: string;
  writtenFiles: string[];
  skippedFiles: string[];
  diagnostics: Diagnostic[];
}

export class PackkitWriteError extends Error {
  code: string;
  path?: string;
  destination?: string;
  cause?: unknown;
}

export function writeGeneratedProject(input: WriteGeneratedProjectInput): Promise<WriteResult>;
