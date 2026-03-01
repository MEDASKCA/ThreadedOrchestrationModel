import { describe, expect, it } from "vitest";
import { gatePlannerDecision } from "../lib/tom/reasoning/planner-gate";
import { TOOL_CONTRACTS } from "../lib/tom/reasoning/tool-contracts";
import type { PlannerDecision } from "../lib/tom/llm/planner";

const VIEWS = [
  { id: "operations.ptl", section: "operations", label: "PTL", implemented: true },
  { id: "planning.sessions", section: "planning", label: "Planning Sessions", implemented: true },
];

const baseDecision = (overrides: Partial<PlannerDecision>): PlannerDecision => ({
  intent: "operational_query",
  routing_hint: "pages_first",
  confidence: 0.9,
  reasons: ["test"],
  ...overrides,
});

describe("planner gate", () => {
  it("removes unknown suggested tool", () => {
    const gated = gatePlannerDecision({
      decision: baseDecision({
        intent: "staffing",
        suggested_tools: ["unknown.tool", "roster.staffing_summary"],
      }),
      message: "staffing today",
      toolContracts: TOOL_CONTRACTS,
      viewRegistry: VIEWS,
    });

    expect(gated.selectedTools).toEqual(["roster.staffing_summary"]);
  });

  it("removes unknown suggested view ids", () => {
    const gated = gatePlannerDecision({
      decision: baseDecision({
        suggested_view_ids: ["unknown.view", "planning.sessions"],
      }),
      message: "show planning",
      toolContracts: TOOL_CONTRACTS,
      viewRegistry: VIEWS,
    });

    expect(gated.selectedTools).toEqual(["view.read"]);
    expect(gated.selectedToolInputs?.["view.read"]).toEqual({ view_id: "planning.sessions" });
  });

  it("pending approval overrides planner route", () => {
    const gated = gatePlannerDecision({
      decision: baseDecision({
        intent: "operational_query",
        routing_hint: "pages_first",
      }),
      message: "do something",
      toolContracts: TOOL_CONTRACTS,
      viewRegistry: VIEWS,
      pending_approval: { action: { type: "update_session" } },
    });

    expect(gated.final_intent).toBe("approval_help");
    expect(gated.final_routing_path).toBe("approval_help");
  });

  it("falls back to deterministic on low confidence", () => {
    const gated = gatePlannerDecision({
      decision: baseDecision({
        intent: "conversational_misc",
        confidence: 0.2,
      }),
      message: "ptl status",
      toolContracts: TOOL_CONTRACTS,
      viewRegistry: VIEWS,
    });

    expect(gated.fallback_to_deterministic).toBe(true);
    expect(gated.final_intent).toBe("operational_query");
  });
});

