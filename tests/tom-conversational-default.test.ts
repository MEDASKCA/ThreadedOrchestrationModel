import { describe, expect, it } from "vitest";
import { shouldRouteConversationalDefault } from "../lib/tom/reasoning/conversational-default";

describe("conversational default routing", () => {
  it("routes vague prompts to conversational_default", () => {
    const shouldRoute = shouldRouteConversationalDefault({
      intent: "operational_query",
      selectedTools: [],
      hasViableViewCandidates: false,
      isExplicitMetricQuery: false,
      isIntegrationCoverageQuery: false,
      isPendingWorkQuery: false,
      isPlanningLikeQuery: false,
      antiFallbackIntent: false,
    });
    expect(shouldRoute).toBe(true);
  });

  it("does not route explicit metric queries to conversational_default", () => {
    const shouldRoute = shouldRouteConversationalDefault({
      intent: "operational_query",
      selectedTools: [],
      hasViableViewCandidates: false,
      isExplicitMetricQuery: true,
      isIntegrationCoverageQuery: false,
      isPendingWorkQuery: false,
      isPlanningLikeQuery: false,
      antiFallbackIntent: false,
    });
    expect(shouldRoute).toBe(false);
  });
});
