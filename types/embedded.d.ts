// Public types for the embedded API (create-packkit/embedded).

import type { PackkitConfig, ResolvedPackkitConfig, ProjectSummary } from './core.js';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  field?: string;
  source?: string;
  previousValue?: unknown;
  resolvedValue?: unknown;
}

export interface GeneratedProjectMetadata {
  packkitVersion: string;
  schemaVersion: number;
  preset?: string;
  generatedAt?: string;
  extension?: Record<string, unknown>;
}

export type DeploymentType = 'static' | 'node-service' | 'library' | 'cli';

export interface DeploymentContract {
  type: DeploymentType;
  buildCommand?: string;
  outputDirectory?: string;
  startCommand?: string;
  port?: number;
  healthCheckPath?: string;
  requiredEnvironmentVariables?: string[];
}

export interface GeneratedProject {
  config: ResolvedPackkitConfig;
  files: Record<string, string>;
  summary: ProjectSummary;
  diagnostics: Diagnostic[];
  metadata: GeneratedProjectMetadata;
  deploymentContract: DeploymentContract;
}

export interface CreateProjectInput {
  name?: string;
  preset?: string;
  config?: PackkitConfig;
  overrides?: PackkitConfig;
}

export type CollisionPolicy = 'error' | 'skip' | 'overwrite';

export interface ProjectExtension {
  files?: Record<string, string>;
  packageJson?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  collisionPolicy?: CollisionPolicy;
}

export interface PackkitProjectDefinition {
  schemaVersion: number;
  packkitVersion: string;
  preset?: string;
  config: PackkitConfig;
  extensions?: {
    files?: Record<string, string>;
    packageJson?: Record<string, unknown>;
  };
}

export class PackkitValidationError extends Error {
  diagnostics: Diagnostic[];
}

export const SCHEMA_VERSION: number;

export function createProject(input?: CreateProjectInput): GeneratedProject;
export function extendProject(project: GeneratedProject, extension?: ProjectExtension): GeneratedProject;
export function exportProjectDefinition(project: GeneratedProject): PackkitProjectDefinition;
export function createProjectFromDefinition(definition: PackkitProjectDefinition): GeneratedProject;
export function calculateProjectDigest(project: GeneratedProject): string;
export function deriveDeploymentContract(config: ResolvedPackkitConfig): DeploymentContract;
