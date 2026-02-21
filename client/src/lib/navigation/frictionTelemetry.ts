const STORAGE_KEY = "frictionTelemetryEvents";
const MAX_EVENTS = 2000;

export type FrictionEventType =
  | "flow_start"
  | "flow_step"
  | "flow_complete"
  | "dead_end"
  | "reversal"
  | "hesitation";

export interface FrictionTelemetryEvent {
  event: FrictionEventType;
  timestamp: string;
  properties: {
    workflow: string;
    surface: string;
    step?: string;
    stepCount?: number;
    elapsedMs?: number;
    note?: string;
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readEvents(): FrictionTelemetryEvent[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      event =>
        typeof event === "object" &&
        event !== null &&
        "event" in event &&
        "timestamp" in event &&
        "properties" in event
    ) as FrictionTelemetryEvent[];
  } catch {
    return [];
  }
}

function writeEvents(events: FrictionTelemetryEvent[]) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // telemetry must not break UI
  }
}

export function trackFrictionEvent(event: FrictionTelemetryEvent) {
  const events = readEvents();
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  writeEvents(events);
}

export function recordFrictionEvent(input: {
  event: FrictionEventType;
  workflow: string;
  surface: string;
  step?: string;
  stepCount?: number;
  elapsedMs?: number;
  note?: string;
}) {
  trackFrictionEvent({
    event: input.event,
    timestamp: new Date().toISOString(),
    properties: {
      workflow: input.workflow,
      surface: input.surface,
      step: input.step,
      stepCount: input.stepCount,
      elapsedMs: input.elapsedMs,
      note: input.note,
    },
  });
}

export function listFrictionEvents(): FrictionTelemetryEvent[] {
  return readEvents();
}

export function clearFrictionEvents() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface WorkflowFrictionSummary {
  workflow: string;
  starts: number;
  completes: number;
  deadEnds: number;
  reversals: number;
  avgSteps: number;
  avgElapsedMs: number;
}

export function summarizeFrictionByWorkflow(): WorkflowFrictionSummary[] {
  const events = readEvents();
  const buckets = new Map<
    string,
    {
      starts: number;
      completes: number;
      deadEnds: number;
      reversals: number;
      stepSamples: number[];
      elapsedSamples: number[];
    }
  >();

  for (const event of events) {
    const workflow = event.properties.workflow;
    const bucket = buckets.get(workflow) ?? {
      starts: 0,
      completes: 0,
      deadEnds: 0,
      reversals: 0,
      stepSamples: [],
      elapsedSamples: [],
    };

    if (event.event === "flow_start") bucket.starts += 1;
    if (event.event === "flow_complete") bucket.completes += 1;
    if (event.event === "dead_end") bucket.deadEnds += 1;
    if (event.event === "reversal") bucket.reversals += 1;

    if (typeof event.properties.stepCount === "number") {
      bucket.stepSamples.push(event.properties.stepCount);
    }
    if (typeof event.properties.elapsedMs === "number") {
      bucket.elapsedSamples.push(event.properties.elapsedMs);
    }

    buckets.set(workflow, bucket);
  }

  return Array.from(buckets.entries())
    .map(([workflow, value]) => ({
      workflow,
      starts: value.starts,
      completes: value.completes,
      deadEnds: value.deadEnds,
      reversals: value.reversals,
      avgSteps:
        value.stepSamples.length > 0
          ? Math.round(
              value.stepSamples.reduce((sum, s) => sum + s, 0) /
                value.stepSamples.length
            )
          : 0,
      avgElapsedMs:
        value.elapsedSamples.length > 0
          ? Math.round(
              value.elapsedSamples.reduce((sum, s) => sum + s, 0) /
                value.elapsedSamples.length
            )
          : 0,
    }))
    .sort((a, b) => a.workflow.localeCompare(b.workflow));
}
