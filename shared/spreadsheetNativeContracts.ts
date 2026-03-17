export type SchemaLifecycleStatus =
  | "canonical"
  | "legacy"
  | "alias"
  | "deprecated"
  | "exception";

export type ForkRelevanceClass =
  | "pilot-core"
  | "adjacent"
  | "exception-surface"
  | "ignore-v1";

export interface SchemaRegistryRecord {
  tableName: string;
  exportName: string;
  schemaFile: string;
  primaryDomainOwner: string;
  lifecycleStatus: SchemaLifecycleStatus;
  forkRelevance: ForkRelevanceClass;
  notes?: string;
}

export interface DomainEntityAliasRecord {
  entityKey: string;
  canonicalTables: string[];
  aliasTables: string[];
  deprecatedTables: string[];
  ownerSurface: string;
  decisionSummary: string;
}

export interface DomainEntityAliasMap {
  version: string;
  generatedAt: string;
  entities: DomainEntityAliasRecord[];
}

export type MigrationSourceClass =
  | "canonical"
  | "legacy-reference"
  | "journaled"
  | "unjournaled"
  | "outside-fork-scope";

export interface MigrationSourceRecord {
  filename: string;
  sourcePath: string;
  sourceStream: "drizzle-root" | "drizzle-migrations" | "journal";
  prefix: number | null;
  classification: MigrationSourceClass;
  rationale: string;
}

export type SheetActionIntent =
  | "edit-data"
  | "advance-workflow"
  | "handoff"
  | "open-sidecar"
  | "export"
  | "import"
  | "inspect"
  | "bulk-edit";

export interface SheetActionContract {
  id: string;
  label: string;
  intent: SheetActionIntent;
  ownerSurface: string;
  requiresSelection: boolean;
  confirmRequired: boolean;
  successArtifact?: string;
}

export interface RowIdentity {
  entityType: string;
  entityId: string | number;
  rowKey: string;
  recordVersion?: string | number | null;
  tableRole:
    | "primary"
    | "child-detail"
    | "stage-lane"
    | "exception-lane"
    | "summary-support"
    | "setup-support";
}

export interface ColumnPreset {
  key: string;
  label: string;
  dataType:
    | "text"
    | "long-text"
    | "number"
    | "currency"
    | "percent"
    | "date"
    | "datetime"
    | "checkbox"
    | "status"
    | "lookup"
    | "relation"
    | "derived";
  editable: boolean;
  bulkEditable: boolean;
  fillAllowed: boolean;
  pasteAllowed: boolean;
  lockedByPermission?: boolean;
}

export interface SidecarDescriptor {
  id: string;
  label: string;
  kind: "inspector" | "activity" | "media" | "exception-resolution";
  ownerSurface: string;
  purpose: string;
}

export interface SheetQueryContract<Row = unknown, Detail = unknown> {
  id: string;
  ownerSurface: string;
  primaryEntity: string;
  queryKey: string;
  returns: {
    primaryRows: Row[];
    supportingRows?: Detail[];
    summary?: Record<string, unknown>;
  };
}

export interface SheetMutationContract<Input = unknown, Result = unknown> {
  id: string;
  ownerSurface: string;
  mutationKey: string;
  intent: SheetActionIntent;
  inputShape: Input;
  resultShape: Result;
}

export interface SheetDefinition {
  id: string;
  workbookId: string;
  label: string;
  archetype:
    | "registry"
    | "document"
    | "queue"
    | "conveyor"
    | "review"
    | "setup";
  primaryEntity: string;
  supportingEntities: string[];
  primaryOwnerSurface: string;
}

export interface WorkbookDefinition {
  id: string;
  label: string;
  route: string;
  section: string;
  sheetIds: string[];
}

export interface WorkbookAdapter {
  workbook: WorkbookDefinition;
  sheets: SheetDefinition[];
  queries: SheetQueryContract[];
  mutations: SheetMutationContract[];
  actions: SheetActionContract[];
  sidecars: SidecarDescriptor[];
}

export interface CapabilityProofCase {
  capabilityId: string;
  criticality: "P0" | "P1" | "P2";
  ownerSurface: string;
  proofStatus: "live-proven" | "code-proven" | "partial" | "blocked";
  requiredArtifact: string;
  notes?: string;
}
