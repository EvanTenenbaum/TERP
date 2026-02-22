export type NorthStarScore = 0 | 1 | 2;

export interface NorthStarScorecardEntry {
  criterion: string;
  score: NorthStarScore;
  evidencePath: string;
  notes?: string;
}

export interface NorthStarGateResult {
  module: string;
  totalScore: number;
  passed: boolean;
  redLineFailures: string[];
  timestamp: string;
}

export interface RedesignReviewArtifactIndex {
  screenshots: string[];
  traces: string[];
  videos: string[];
  flowMetrics: string[];
  qaReports: string[];
}

export interface NorthStarScorecardDocument {
  version: string;
  module: string;
  reviewedAt: string;
  reviewedBy?: string;
  hypothesis?: string;
  entries: NorthStarScorecardEntry[];
  gateResult: NorthStarGateResult;
  artifactIndex: RedesignReviewArtifactIndex;
}

export type VerificationVerdict = "VERIFIED" | "FAILED" | "INCOMPLETE";

export interface AbilityLedgerEntry {
  route: string;
  ability: string;
  scope: "in_scope" | "excluded";
  status: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "FAILED";
  paritySource: string;
  evidencePath?: string;
  notes?: string;
}

export interface PhaseGateRecord {
  phase: string;
  gateName: string;
  status: VerificationVerdict;
  checkedAt: string;
  commands: string[];
  evidencePaths: string[];
  notes?: string;
}

export interface SchemaContractResult {
  checkName: string;
  status: VerificationVerdict;
  details: string;
  evidencePath?: string;
}

export interface AnyDebtDelta {
  scope: "global" | "touched_files";
  explicitAnyAdded: number;
  explicitAnyRemoved: number;
  tsIgnoreAdded: number;
  tsIgnoreRemoved: number;
  eslintDisableAnyAdded: number;
  eslintDisableAnyRemoved: number;
}

export interface QaArtifactManifest {
  taskId: string;
  phase: string;
  runDate: string;
  taskDir: string;
  commandsLog: string;
  verificationFile: string;
  screensDir: string;
  consoleLog: string;
  networkLog: string;
  notesFile: string;
}

export interface ExecutionTaskPacket {
  id: string;
  phase: string;
  module: string;
  title: string;
  scope: string;
  filesTouched: string[];
  commands: string[];
  expectedArtifacts: string[];
  passCriteria: string[];
  rollbackPlan: string;
}
