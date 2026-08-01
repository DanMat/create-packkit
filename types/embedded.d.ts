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

/** How a stored extension file relates to generated output: `add` = the host
 *  introduced a new path; `replace` = it deliberately overrode a generated one. */
export interface StoredExtensionFile {
  content: string;
  mode: 'add' | 'replace';
}

export interface PackkitProjectDefinition {
  schemaVersion: number;
  packkitVersion: string;
  preset?: string;
  config: PackkitConfig;
  extensions?: {
    files?: Record<string, StoredExtensionFile>;
    packageJson?: Record<string, unknown>;
  };
}

export class PackkitValidationError extends Error {
  readonly code: 'PACKKIT_VALIDATION_FAILED';
  diagnostics: Diagnostic[];
}

export const SCHEMA_VERSION: number;

export function createProject(input?: CreateProjectInput): GeneratedProject;
export function resolveProjectConfig(input?: CreateProjectInput): { config: ResolvedPackkitConfig; diagnostics: Diagnostic[] };
export function createProjectFromResolvedConfig(config: ResolvedPackkitConfig, options?: { diagnostics?: Diagnostic[] }): GeneratedProject;
export function extendProject(project: GeneratedProject, extension?: ProjectExtension): GeneratedProject;
export function exportProjectDefinition(project: GeneratedProject): PackkitProjectDefinition;
export function createProjectFromDefinition(
  definition: PackkitProjectDefinition,
  options?: { driftPolicy?: 'report' | 'error' },
): GeneratedProject;
export function calculateProjectDigest(project: GeneratedProject): string;
export function deriveDeploymentContract(config: ResolvedPackkitConfig): DeploymentContract;

export type DependencySection = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

export interface DependencyChange {
  /** Absent when the dependency is newly added. */
  current?: string;
  generated: string;
}

/** Dependency changes keyed by section, then package name — never by name alone. */
export type DependencyChangeMap = Record<DependencySection, Record<string, DependencyChange>>;

export interface PackageFieldChange {
  field: string;
  current?: unknown;
  generated: unknown;
}

export interface PackageUpgradePlan {
  addedScripts: Record<string, string>;
  changedScripts: Record<string, { current: string; generated: string }>;
  addedDependencies: DependencyChangeMap;
  changedDependencies: DependencyChangeMap;
  addedFields: PackageFieldChange[];
  changedFields: PackageFieldChange[];
}

export interface UpgradePlan {
  files: { added: string[]; changed: string[]; unchanged: string[] };
  packageJson: PackageUpgradePlan;
  provenanceOutdated: boolean;
}

export type UpgradeApplyMode = 'add-only' | 'replace-changed';

/** Per-category apply policy. Default is add-only everywhere (non-destructive). */
export interface UpgradeApplyPolicy {
  files: UpgradeApplyMode;
  scripts: UpgradeApplyMode;
  dependencies: UpgradeApplyMode;
  packageFields: UpgradeApplyMode;
}

export const DEFAULT_UPGRADE_POLICY: Readonly<UpgradeApplyPolicy>;

export function planUpgrade(input: { generated: Record<string, string>; onDisk: Record<string, string | undefined> }): UpgradePlan;
export function isUpgradeEmpty(plan: UpgradePlan): boolean;
export function buildUpgradeWrite(input: {
  generated: Record<string, string>;
  onDisk: Record<string, string | undefined>;
  plan: UpgradePlan;
  policy?: Partial<UpgradeApplyPolicy>;
}): Record<string, string>;
