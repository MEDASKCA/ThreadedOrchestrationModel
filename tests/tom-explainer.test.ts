import { describe, expect, it } from "vitest";
import { buildExplanation } from "../lib/tom/narrative/explainer";

describe("explainer", () => {
  it("concise output includes checked line", () => {
    const result = buildExplanation({
      mode: "concise",
      page_type: "rtt",
      finding_type: "compliance",
      finding_data: { percent_within_18w: 61, specialty: "Cardiology", forecast_breaches: 4 },
      evidence_summary: "Operations -> RTT Monitoring tiles and specialty compliance rows.",
    });
    expect(result.summary).toContain("Checked:");
    expect(result.summary).toContain("61%");
  });

  it("expanded output returns 3+ bullets", () => {
    const result = buildExplanation({
      mode: "expanded",
      page_type: "rtt",
      finding_type: "compliance",
      finding_data: { percent_within_18w: 61, breaches_52w: 3, specialty: "General Surgery" },
      evidence_summary: "Operations -> RTT Monitoring tiles and specialty compliance rows.",
    });
    expect((result.bullets || []).length).toBeGreaterThanOrEqual(3);
  });

  it("expanded output does not add new digits beyond finding_data", () => {
    const result = buildExplanation({
      mode: "expanded",
      page_type: "ptl",
      finding_type: "longest_waiter",
      finding_data: { waiting_days: 320, rtt_target_weeks: 18, patient_name: "Marcus Osei" },
      evidence_summary: "Operations -> PTL patient-level rows.",
    });
    const text = `${result.summary} ${(result.bullets || []).join(" ")}`;
    const digits = Array.from(new Set(text.match(/\d+/g) || []));
    const allowed = new Set(["320", "18"]);
    expect(digits.every((digit) => allowed.has(digit))).toBe(true);
  });
});
