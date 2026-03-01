import { describe, expect, it } from "vitest";
import { normalizeCancer2WWPage } from "../lib/tom/pages/cancer-2ww";
import {
  activeReferrals,
  highestRiskSpecialties,
  urgentDiagnosticsPending,
} from "../lib/tom/pages/cancer-2ww-analyser";

describe("cancer 2ww analyser", () => {
  it("uses tile active referrals when present, else sums rows", () => {
    const withTile = normalizeCancer2WWPage({
      metrics: { active_2ww: 21 },
      table: {
        rows: [
          { specialty: "General Surgery", active: 5, compliance: 40, urgent_dx: 2, breaches: 1 },
          { specialty: "Cardiology", active: 6, compliance: 30, urgent_dx: 3, breaches: 0 },
        ],
      },
    });
    expect(activeReferrals(withTile)).toBe(21);

    const withoutTile = normalizeCancer2WWPage({
      table: {
        rows: [
          { specialty: "General Surgery", active: 5, compliance: 40, urgent_dx: 2, breaches: 1 },
          { specialty: "Cardiology", active: 6, compliance: 30, urgent_dx: 3, breaches: 0 },
        ],
      },
    });
    expect(activeReferrals(withoutTile)).toBe(11);
  });

  it("prioritises risk reasons breaches > urgent diagnostics > low compliance", () => {
    const page = normalizeCancer2WWPage({
      table: {
        rows: [
          { specialty: "General Surgery", active: 10, compliance: 45, urgent_dx: 0, breaches: 2 },
          { specialty: "Oncology", active: 8, compliance: 70, urgent_dx: 5, breaches: 0 },
          { specialty: "Cardiology", active: 12, compliance: 40, urgent_dx: 0, breaches: 0 },
        ],
      },
    });
    expect(highestRiskSpecialties(page)).toEqual([
      { specialty: "General Surgery", reason: "breaches" },
      { specialty: "Oncology", reason: "urgent_diagnostics_pending" },
      { specialty: "Cardiology", reason: "low_62d_compliance" },
    ]);
  });

  it("computes urgent diagnostics pending from tile or rows", () => {
    const withTile = normalizeCancer2WWPage({
      metrics: { urgent_diagnostics_pending: 9 },
      table: {
        rows: [{ specialty: "General Surgery", active: 5, compliance: 40, urgent_dx: 2, breaches: 1 }],
      },
    });
    expect(urgentDiagnosticsPending(withTile)).toBe(9);

    const byRows = normalizeCancer2WWPage({
      table: {
        rows: [
          { specialty: "General Surgery", active: 5, compliance: 40, urgent_dx: 2, breaches: 1 },
          { specialty: "Cardiology", active: 6, compliance: 30, urgent_dx: 3, breaches: 0 },
        ],
      },
    });
    expect(urgentDiagnosticsPending(byRows)).toBe(5);
  });
});
