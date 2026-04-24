import type { ChainResult } from "./types";

export type LiveTransactionBundleId = "quick" | "full";
export type LiveTransactionLane =
  | "sales"
  | "inventory"
  | "accounting"
  | "ops"
  | "cross-domain"
  | "edge";

export type LiveTransactionCheckpointId =
  | "preconditions"
  | "created"
  | "persisted"
  | "edited"
  | "downstream"
  | "closed"
  | "audit";

export type LiveTransactionCheckpointStatus =
  | "passed"
  | "failed"
  | "not_applicable";

export interface LiveTransactionCheckpointDefinition {
  id: LiveTransactionCheckpointId;
  label: string;
  phaseMatchers?: RegExp[];
}

export interface LiveTransactionTemplate {
  templateId: string;
  chainId: string;
  title: string;
  family: string;
  lane: LiveTransactionLane;
  repeat: number;
  objective: string;
  moduleEdges: string[];
  expectedArtifacts: string[];
  checkpoints: LiveTransactionCheckpointDefinition[];
}

export interface LiveTransactionScenario {
  transactionId: string;
  ordinal: number;
  templateId: string;
  chainId: string;
  title: string;
  family: string;
  lane: LiveTransactionLane;
  objective: string;
  moduleEdges: string[];
  expectedArtifacts: string[];
  checkpoints: LiveTransactionCheckpointDefinition[];
}

export interface LiveTransactionSwarmPlan {
  runId: string;
  bundleId: LiveTransactionBundleId;
  generatedAt: string;
  baseUrl: string;
  transactionDateCode: string;
  transactions: LiveTransactionScenario[];
  summary: {
    totalTransactions: number;
    byLane: Record<LiveTransactionLane, number>;
    byFamily: Record<string, number>;
  };
}

export interface LiveTransactionCheckpointResult {
  id: LiveTransactionCheckpointId;
  label: string;
  status: LiveTransactionCheckpointStatus;
  evidence: string;
}

export interface LiveTransactionExecutionRecord {
  transactionId: string;
  templateId: string;
  chainId: string;
  title: string;
  family: string;
  lane: LiveTransactionLane;
  objective: string;
  moduleEdges: string[];
  expectedArtifacts: string[];
  status: "passed" | "failed";
  failureType?: ChainResult["failure_type"];
  durationMs: number;
  checkpoints: LiveTransactionCheckpointResult[];
  invariantSummary: {
    total: number;
    passed: number;
    failed: number;
  };
  extractedIdentifiers: Record<string, unknown>;
  screenshots: string[];
  errors: string[];
}

export interface BuildSwarmPlanOptions {
  runId: string;
  baseUrl: string;
  maxTransactions?: number;
  transactionDateCode?: string;
}

const STANDARD_CHECKPOINTS: LiveTransactionCheckpointDefinition[] = [
  { id: "preconditions", label: "Preconditions satisfied" },
  {
    id: "created",
    label: "Primary record created",
    phaseMatchers: [
      /save|create|open-create|submit|finalize|record-payment|intake|batch|invoice|bill/i,
    ],
  },
  {
    id: "persisted",
    label: "Record persisted after navigation",
    phaseMatchers: [/return|search|persist|back-at-list|verify.*persist/i],
  },
  {
    id: "edited",
    label: "Record edited after creation",
    phaseMatchers: [
      /edit|modify|update|mark-invoice-sent|select-payment-terms/i,
    ],
  },
  {
    id: "downstream",
    label: "Downstream module effect visible",
    phaseMatchers: [
      /payment|invoice|ledger|movement|transfer|return|workflow|bill|client/i,
    ],
  },
  {
    id: "closed",
    label: "Lifecycle closed or materially advanced",
    phaseMatchers: [
      /finalize|confirm|complete|sent|paid|record-payment|approve/i,
    ],
  },
  { id: "audit", label: "Screenshots and identifiers captured" },
];

const QUICK_BUNDLE_TEMPLATES: LiveTransactionTemplate[] = [
  {
    templateId: "sales-client-primer-quick",
    chainId: "sales.client-full-crud",
    title: "Client primer",
    family: "swarm-primers",
    lane: "sales",
    repeat: 1,
    objective:
      "Seed a real client record before downstream order and accounting flows run.",
    moduleEdges: ["clients", "sales", "search", "crm"],
    expectedArtifacts: ["clientId", "search proof", "edit proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "inventory-strain-primer-quick",
    chainId: "inventory.strain-management",
    title: "Strain primer",
    family: "swarm-primers",
    lane: "inventory",
    repeat: 1,
    objective:
      "Seed a real strain record and prove it persists across route changes so later inventory creation paths have data to work with.",
    moduleEdges: ["products", "strains", "inventory"],
    expectedArtifacts: ["strain proof", "route persistence proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "inventory-batch-primer-quick",
    chainId: "inventory.batch-primer-create-only",
    title: "Batch primer",
    family: "swarm-primers",
    lane: "inventory",
    repeat: 1,
    objective:
      "Create live inventory through direct intake before sales and accounting flows try to consume stock.",
    moduleEdges: ["inventory", "direct-intake", "locations", "audit-trail"],
    expectedArtifacts: [
      "direct intake proof",
      "inventory search proof",
      "submitted row proof",
    ],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "sales-order-quick",
    chainId: "sales.order-full-lifecycle",
    title: "Sales order full lifecycle",
    family: "order-to-cash",
    lane: "sales",
    repeat: 1,
    objective:
      "Create, edit, finalize, and re-open a sales order without losing state.",
    moduleEdges: ["sales", "clients", "pricing", "orders"],
    expectedArtifacts: [
      "orderId",
      "draft persistence proof",
      "finalized status",
    ],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "inventory-intake-quick",
    chainId: "inventory.intake-to-batch",
    title: "Inventory intake to batch",
    family: "procure-to-stock",
    lane: "inventory",
    repeat: 1,
    objective:
      "Receive inventory through intake and confirm it materializes as a usable batch.",
    moduleEdges: ["procurement", "inventory", "locations", "supplier intake"],
    expectedArtifacts: ["batchId", "movement proof", "inventory visibility"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "accounting-invoice-quick",
    chainId: "accounting.invoice-lifecycle",
    title: "Accounting invoice lifecycle",
    family: "invoice-and-payment",
    lane: "accounting",
    repeat: 1,
    objective: "Create, send, and partially or fully settle an invoice.",
    moduleEdges: ["invoices", "payments", "client-ledger", "accounting"],
    expectedArtifacts: ["invoiceId", "payment proof", "status transition"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "accounting-payment-quick",
    chainId: "accounting.payment-recording",
    title: "Payment recording",
    family: "invoice-and-payment",
    lane: "accounting",
    repeat: 1,
    objective:
      "Record a payment and verify it lands in the correct downstream accounting surfaces.",
    moduleEdges: ["payments", "invoices", "ledger", "client-ledger"],
    expectedArtifacts: ["payment proof", "invoice balance update"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-sales-cash-quick",
    chainId: "golden.sales-to-cash",
    title: "Golden sales to cash",
    family: "cross-domain-golden",
    lane: "cross-domain",
    repeat: 1,
    objective:
      "Drive a full cross-module sales flow and confirm the handoffs stay intact.",
    moduleEdges: ["sales", "fulfillment", "invoices", "payments", "ledger"],
    expectedArtifacts: ["cross-domain proof", "handoff screenshots"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-procure-stock-quick",
    chainId: "golden.procure-to-stock",
    title: "Golden procure to stock",
    family: "cross-domain-golden",
    lane: "cross-domain",
    repeat: 1,
    objective:
      "Push procurement into stock and verify inventory availability and accounting side effects.",
    moduleEdges: ["purchase-orders", "receiving", "inventory", "accounting"],
    expectedArtifacts: [
      "receiving proof",
      "batch visibility",
      "status transition",
    ],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-returns-quick",
    chainId: "golden.returns-and-credits",
    title: "Golden returns and credits",
    family: "returns-and-recovery",
    lane: "cross-domain",
    repeat: 1,
    objective:
      "Verify a return/credit path updates both the originating record and the downstream balances.",
    moduleEdges: ["returns", "credits", "orders", "client-ledger"],
    expectedArtifacts: ["return proof", "credit proof", "ledger update"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "ops-workflow-quick",
    chainId: "ops.workflow-management",
    title: "Workflow management",
    family: "operations-control",
    lane: "ops",
    repeat: 1,
    objective:
      "Confirm workflow queues reflect new work and remain actionable.",
    moduleEdges: ["workflow-queue", "tasks", "ops"],
    expectedArtifacts: ["workflow proof", "queue visibility"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "edge-status-quick",
    chainId: "edge.status-transition-enforcement",
    title: "Status transition enforcement",
    family: "guardrails",
    lane: "edge",
    repeat: 1,
    objective:
      "Ensure invalid state transitions are blocked while valid ones still succeed.",
    moduleEdges: ["orders", "state-machine", "workflow"],
    expectedArtifacts: ["blocked invalid transition", "valid transition proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
];

const FULL_BUNDLE_TEMPLATES: LiveTransactionTemplate[] = [
  {
    templateId: "sales-client-primer-full",
    chainId: "sales.client-full-crud",
    title: "Client primer",
    family: "swarm-primers",
    lane: "sales",
    repeat: 2,
    objective: "Seed real client records before downstream flows execute.",
    moduleEdges: ["clients", "sales", "search", "crm"],
    expectedArtifacts: ["clientId", "search proof", "edit proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "inventory-strain-primer-full",
    chainId: "inventory.strain-management",
    title: "Strain primer",
    family: "swarm-primers",
    lane: "inventory",
    repeat: 2,
    objective:
      "Seed real strain records and prove they persist across route changes before downstream inventory flows execute.",
    moduleEdges: ["products", "strains", "inventory"],
    expectedArtifacts: ["strain proof", "route persistence proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "sales-order-full",
    chainId: "sales.order-full-lifecycle",
    title: "Sales order full lifecycle",
    family: "order-to-cash",
    lane: "sales",
    repeat: 4,
    objective:
      "Create, edit, and finalize multiple live sales orders end to end.",
    moduleEdges: ["sales", "clients", "pricing", "orders"],
    expectedArtifacts: ["orderId", "line-item proof", "finalized status"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "inventory-intake-full",
    chainId: "inventory.intake-to-batch",
    title: "Inventory intake to batch",
    family: "procure-to-stock",
    lane: "inventory",
    repeat: 3,
    objective:
      "Exercise inbound receiving through batch creation several times with distinct records.",
    moduleEdges: ["procurement", "inventory", "locations", "supplier intake"],
    expectedArtifacts: ["batchId", "receiving proof", "inventory visibility"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "inventory-batch-full",
    chainId: "inventory.batch-primer-create-only",
    title: "Batch full lifecycle",
    family: "inventory-control",
    lane: "inventory",
    repeat: 3,
    objective:
      "Create and persist live inventory through direct intake so downstream sales and accounting paths have real stock to work with.",
    moduleEdges: ["inventory", "direct-intake", "locations", "audit-trail"],
    expectedArtifacts: [
      "direct intake proof",
      "inventory search proof",
      "submitted row proof",
    ],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "accounting-invoice-full",
    chainId: "accounting.invoice-lifecycle",
    title: "Invoice lifecycle",
    family: "invoice-and-payment",
    lane: "accounting",
    repeat: 4,
    objective:
      "Create, send, and reconcile multiple invoices so AR surfaces are exercised repeatedly.",
    moduleEdges: ["invoices", "payments", "client-ledger", "accounting"],
    expectedArtifacts: ["invoiceId", "payment proof", "status transition"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "accounting-payment-full",
    chainId: "accounting.payment-recording",
    title: "Payment recording",
    family: "invoice-and-payment",
    lane: "accounting",
    repeat: 3,
    objective:
      "Record standalone payments and confirm balances update everywhere they should.",
    moduleEdges: ["payments", "invoices", "ledger", "client-ledger"],
    expectedArtifacts: ["payment proof", "invoice balance update"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "accounting-bill-full",
    chainId: "accounting.bill-management",
    title: "Bill management",
    family: "ap-and-payables",
    lane: "accounting",
    repeat: 2,
    objective:
      "Exercise AP creation, persistence, and status handling through live bills.",
    moduleEdges: ["bills", "payables", "suppliers", "accounting"],
    expectedArtifacts: ["bill proof", "payables visibility"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "sales-sheet-full",
    chainId: "sales.sales-sheet-lifecycle",
    title: "Sales sheet lifecycle",
    family: "sales-sheets",
    lane: "sales",
    repeat: 2,
    objective:
      "Create and persist sales-sheet work so conversion-adjacent paths stay exercised.",
    moduleEdges: ["sales-sheets", "sales", "live-shopping"],
    expectedArtifacts: ["sheet proof", "persistence proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-sales-cash-full",
    chainId: "golden.sales-to-cash",
    title: "Golden sales to cash",
    family: "cross-domain-golden",
    lane: "cross-domain",
    repeat: 2,
    objective:
      "Exercise cross-domain sales handoffs multiple times with live writes.",
    moduleEdges: ["sales", "fulfillment", "invoices", "payments", "ledger"],
    expectedArtifacts: ["cross-domain proof", "handoff screenshots"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-procure-stock-full",
    chainId: "golden.procure-to-stock",
    title: "Golden procure to stock",
    family: "cross-domain-golden",
    lane: "cross-domain",
    repeat: 2,
    objective:
      "Exercise procurement and stock handoffs with real staged records.",
    moduleEdges: ["purchase-orders", "receiving", "inventory", "accounting"],
    expectedArtifacts: [
      "receiving proof",
      "inventory visibility",
      "status transition",
    ],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-inventory-full",
    chainId: "golden.inventory-lifecycle",
    title: "Golden inventory lifecycle",
    family: "cross-domain-golden",
    lane: "cross-domain",
    repeat: 2,
    objective:
      "Run inventory lifecycle coverage that reaches beyond a single page flow.",
    moduleEdges: ["inventory", "movements", "locations", "adjustments"],
    expectedArtifacts: [
      "cross-domain inventory proof",
      "lifecycle screenshots",
    ],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "golden-returns-full",
    chainId: "golden.returns-and-credits",
    title: "Golden returns and credits",
    family: "returns-and-recovery",
    lane: "cross-domain",
    repeat: 2,
    objective:
      "Exercise return and credit loops with real downstream balance effects.",
    moduleEdges: ["returns", "credits", "orders", "client-ledger"],
    expectedArtifacts: ["return proof", "credit proof", "ledger update"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "edge-double-submit-full",
    chainId: "edge.double-submit-prevention",
    title: "Double submit prevention",
    family: "guardrails",
    lane: "edge",
    repeat: 1,
    objective:
      "Verify duplicate submit guardrails still hold during live write traffic.",
    moduleEdges: ["forms", "dedupe", "save-state"],
    expectedArtifacts: ["guardrail proof", "no duplicate state"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "edge-status-full",
    chainId: "edge.status-transition-enforcement",
    title: "Status transition enforcement",
    family: "guardrails",
    lane: "edge",
    repeat: 1,
    objective: "Verify state-machine enforcement on live transaction paths.",
    moduleEdges: ["orders", "state-machine", "workflow"],
    expectedArtifacts: ["blocked invalid transition", "valid transition proof"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
  {
    templateId: "edge-concurrency-full",
    chainId: "edge.concurrent-tab-simulation",
    title: "Concurrent tab simulation",
    family: "guardrails",
    lane: "edge",
    repeat: 1,
    objective:
      "Probe multi-tab state handling while the staging org is carrying live write traffic.",
    moduleEdges: ["save-state", "concurrency", "drafts"],
    expectedArtifacts: ["concurrency proof", "conflict handling evidence"],
    checkpoints: STANDARD_CHECKPOINTS,
  },
];

function getTemplates(
  bundleId: LiveTransactionBundleId
): LiveTransactionTemplate[] {
  return bundleId === "quick" ? QUICK_BUNDLE_TEMPLATES : FULL_BUNDLE_TEMPLATES;
}

function createEmptyLaneSummary(): Record<LiveTransactionLane, number> {
  return {
    sales: 0,
    inventory: 0,
    accounting: 0,
    ops: 0,
    "cross-domain": 0,
    edge: 0,
  };
}

export function buildLiveTransactionSwarmPlan(
  bundleId: LiveTransactionBundleId,
  options: BuildSwarmPlanOptions
): LiveTransactionSwarmPlan {
  const transactionDateCode =
    options.transactionDateCode ??
    new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const transactions: LiveTransactionScenario[] = [];
  const templates = getTemplates(bundleId);
  let ordinal = 1;

  for (const template of templates) {
    for (let repeatIndex = 0; repeatIndex < template.repeat; repeatIndex++) {
      if (
        typeof options.maxTransactions === "number" &&
        transactions.length >= options.maxTransactions
      ) {
        break;
      }

      transactions.push({
        transactionId: `LTX-${transactionDateCode}-${String(ordinal).padStart(3, "0")}`,
        ordinal,
        templateId: template.templateId,
        chainId: template.chainId,
        title:
          template.repeat > 1
            ? `${template.title} #${repeatIndex + 1}`
            : template.title,
        family: template.family,
        lane: template.lane,
        objective: template.objective,
        moduleEdges: [...template.moduleEdges],
        expectedArtifacts: [...template.expectedArtifacts],
        checkpoints: template.checkpoints.map(checkpoint => ({
          ...checkpoint,
          phaseMatchers: checkpoint.phaseMatchers?.map(
            matcher => new RegExp(matcher.source, matcher.flags)
          ),
        })),
      });
      ordinal += 1;
    }
  }

  const byLane = createEmptyLaneSummary();
  const byFamily: Record<string, number> = {};

  for (const transaction of transactions) {
    byLane[transaction.lane] += 1;
    byFamily[transaction.family] = (byFamily[transaction.family] ?? 0) + 1;
  }

  return {
    runId: options.runId,
    bundleId,
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    transactionDateCode,
    transactions,
    summary: {
      totalTransactions: transactions.length,
      byLane,
      byFamily,
    },
  };
}

export function extractIdentifiersFromChainResult(
  result: ChainResult
): Record<string, unknown> {
  const identifiers: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(result.stored_snapshot ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (
      /(^|_)(id|number)$/i.test(key) ||
      /(order|invoice|batch|client|payment|bill)/i.test(key)
    ) {
      identifiers[key] = value;
    }
  }

  return identifiers;
}

function findSuccessfulPhase(
  result: ChainResult,
  matchers: RegExp[] | undefined
): string | undefined {
  if (!matchers || matchers.length === 0) return undefined;
  for (const phase of result.phases) {
    if (!phase.success) continue;
    if (matchers.some(matcher => matcher.test(phase.phase_id))) {
      return phase.phase_id;
    }
  }
  return undefined;
}

export function deriveCheckpointResults(
  transaction: LiveTransactionScenario,
  result: ChainResult
): LiveTransactionCheckpointResult[] {
  const identifiers = extractIdentifiersFromChainResult(result);
  const invariantFailed = result.invariant_results.find(
    invariant => !invariant.passed
  );
  const preconditionFailure = result.phases.find(
    phase => phase.phase_id === "precondition-setup" && !phase.success
  );

  return transaction.checkpoints.map(checkpoint => {
    if (checkpoint.id === "preconditions") {
      return {
        id: checkpoint.id,
        label: checkpoint.label,
        status: preconditionFailure ? "failed" : "passed",
        evidence: preconditionFailure
          ? preconditionFailure.errors.join("; ")
          : "Chain preconditions passed",
      };
    }

    if (checkpoint.id === "audit") {
      const screenshotCount = result.phases.reduce(
        (count, phase) => count + phase.screenshots.length,
        0
      );
      const identifierCount = Object.keys(identifiers).length;
      const passed = screenshotCount > 0 || identifierCount > 0;
      return {
        id: checkpoint.id,
        label: checkpoint.label,
        status: passed ? "passed" : "failed",
        evidence: passed
          ? `${screenshotCount} screenshots, ${identifierCount} extracted identifiers`
          : "No screenshots or extracted identifiers were recorded",
      };
    }

    const matchedPhase = findSuccessfulPhase(result, checkpoint.phaseMatchers);
    if (!matchedPhase) {
      if (checkpoint.id === "created" && Object.keys(identifiers).length > 0) {
        return {
          id: checkpoint.id,
          label: checkpoint.label,
          status: "passed",
          evidence: `Identifiers captured: ${Object.keys(identifiers).join(", ")}`,
        };
      }

      return {
        id: checkpoint.id,
        label: checkpoint.label,
        status: "not_applicable",
        evidence: "No matching successful phase found for this checkpoint",
      };
    }

    if (checkpoint.id === "downstream" && invariantFailed) {
      return {
        id: checkpoint.id,
        label: checkpoint.label,
        status: "failed",
        evidence: invariantFailed.error ?? invariantFailed.name,
      };
    }

    return {
      id: checkpoint.id,
      label: checkpoint.label,
      status: "passed",
      evidence: `Satisfied by phase "${matchedPhase}"`,
    };
  });
}

export function buildExecutionRecord(
  transaction: LiveTransactionScenario,
  result: ChainResult
): LiveTransactionExecutionRecord {
  const screenshots = result.phases.flatMap(phase => phase.screenshots);
  const errors = result.phases.flatMap(phase => phase.errors);
  const invariantFailedCount = result.invariant_results.filter(
    invariant => !invariant.passed
  ).length;

  return {
    transactionId: transaction.transactionId,
    templateId: transaction.templateId,
    chainId: transaction.chainId,
    title: transaction.title,
    family: transaction.family,
    lane: transaction.lane,
    objective: transaction.objective,
    moduleEdges: [...transaction.moduleEdges],
    expectedArtifacts: [...transaction.expectedArtifacts],
    status: result.success ? "passed" : "failed",
    failureType: result.failure_type,
    durationMs: result.duration_ms,
    checkpoints: deriveCheckpointResults(transaction, result),
    invariantSummary: {
      total: result.invariant_results.length,
      passed: result.invariant_results.length - invariantFailedCount,
      failed: invariantFailedCount,
    },
    extractedIdentifiers: extractIdentifiersFromChainResult(result),
    screenshots,
    errors,
  };
}
