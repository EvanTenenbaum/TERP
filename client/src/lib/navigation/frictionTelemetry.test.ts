import {
  clearFrictionEvents,
  listFrictionEvents,
  recordFrictionEvent,
  summarizeFrictionByWorkflow,
} from "./frictionTelemetry";

describe("frictionTelemetry", () => {
  beforeEach(() => {
    clearFrictionEvents();
  });

  it("records and lists events", () => {
    recordFrictionEvent({
      event: "flow_start",
      workflow: "GF-002",
      surface: "purchase-orders",
      step: "open",
    });

    const events = listFrictionEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "flow_start",
      properties: {
        workflow: "GF-002",
        surface: "purchase-orders",
        step: "open",
      },
    });
  });

  it("summarizes per workflow", () => {
    recordFrictionEvent({
      event: "flow_start",
      workflow: "GF-002",
      surface: "purchase-orders",
      stepCount: 1,
      elapsedMs: 0,
    });
    recordFrictionEvent({
      event: "flow_complete",
      workflow: "GF-002",
      surface: "purchase-orders",
      stepCount: 6,
      elapsedMs: 15000,
    });
    recordFrictionEvent({
      event: "dead_end",
      workflow: "GF-002",
      surface: "purchase-orders",
      stepCount: 4,
      elapsedMs: 10000,
    });

    const summary = summarizeFrictionByWorkflow();
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      workflow: "GF-002",
      starts: 1,
      completes: 1,
      deadEnds: 1,
      reversals: 0,
    });
    expect(summary[0].avgSteps).toBeGreaterThan(0);
    expect(summary[0].avgElapsedMs).toBeGreaterThan(0);
  });
});
