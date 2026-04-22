/**
 * Intake progress tracking types
 * TER-1228: Multi-entity intake transaction progress and rollback
 */

export type IntakeStepName =
  | "VALIDATE_COGS"
  | "CREATE_VENDOR"
  | "LOOKUP_SUPPLIER"
  | "CREATE_BRAND"
  | "CREATE_PRODUCT"
  | "CREATE_LOT"
  | "CREATE_BATCH"
  | "CREATE_LOCATION"
  | "CREATE_AUDIT"
  | "CREATE_PAYABLE";

export type IntakeStepStatus = "pending" | "running" | "complete" | "failed";

export interface IntakeStep {
  name: IntakeStepName;
  status: IntakeStepStatus;
  label: string;
  error?: string;
  entityId?: number;
}

export interface IntakeProgress {
  steps: IntakeStep[];
  currentStep?: IntakeStepName;
  completedSteps: IntakeStepName[];
  failedStep?: IntakeStepName;
  canRollback: boolean;
}

export interface IntakeProgressUpdate {
  step: IntakeStepName;
  status: IntakeStepStatus;
  error?: string;
  entityId?: number;
}

export const INTAKE_STEP_LABELS: Record<IntakeStepName, string> = {
  VALIDATE_COGS: "Validating cost information",
  CREATE_VENDOR: "Creating vendor record",
  LOOKUP_SUPPLIER: "Looking up supplier",
  CREATE_BRAND: "Creating brand record",
  CREATE_PRODUCT: "Creating product record",
  CREATE_LOT: "Generating lot code",
  CREATE_BATCH: "Creating batch record",
  CREATE_LOCATION: "Setting up batch location",
  CREATE_AUDIT: "Creating audit log",
  CREATE_PAYABLE: "Creating payable record",
};

export const INTAKE_STEP_ORDER: IntakeStepName[] = [
  "VALIDATE_COGS",
  "CREATE_VENDOR",
  "LOOKUP_SUPPLIER",
  "CREATE_BRAND",
  "CREATE_PRODUCT",
  "CREATE_LOT",
  "CREATE_BATCH",
  "CREATE_LOCATION",
  "CREATE_AUDIT",
  "CREATE_PAYABLE",
];

export function createInitialProgress(): IntakeProgress {
  return {
    steps: INTAKE_STEP_ORDER.map((name) => ({
      name,
      status: "pending" as const,
      label: INTAKE_STEP_LABELS[name],
    })),
    completedSteps: [],
    canRollback: false,
  };
}

export function updateProgress(
  progress: IntakeProgress,
  update: IntakeProgressUpdate
): IntakeProgress {
  const steps = progress.steps.map((step) =>
    step.name === update.step
      ? {
          ...step,
          status: update.status,
          error: update.error,
          entityId: update.entityId,
        }
      : step
  );

  const completedSteps =
    update.status === "complete"
      ? [...progress.completedSteps, update.step]
      : progress.completedSteps;

  const failedStep = update.status === "failed" ? update.step : progress.failedStep;

  return {
    steps,
    currentStep: update.status === "running" ? update.step : progress.currentStep,
    completedSteps,
    failedStep,
    canRollback: failedStep !== undefined && completedSteps.length > 0,
  };
}
