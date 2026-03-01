import { describe, expect, it } from "vitest";
import { RICH_RESPONSE_SCHEMA, type RichResponse } from "../lib/tom/rich-response";

describe("table section schema", () => {
  it("exposes table section schema keys", () => {
    const sectionProps = (RICH_RESPONSE_SCHEMA.schema.properties.sections.items as any).properties;
    expect(sectionProps.type.enum).toContain("table");
    expect(sectionProps.table).toBeTruthy();
  });

  it("accepts table section in response type", () => {
    const rich: RichResponse = {
      title: "Snapshot",
      summary: "Table snapshot",
      sections: [
        {
          type: "table",
          title: "PTL",
          heading: "PTL",
          body: "Table",
          bullets: [],
          table: {
            columns: [{ key: "patient", label: "Patient" }],
            rows: [{ patient: "A" }],
          },
        },
      ],
      tables: [],
      next_actions: [],
      data_used: [],
      context_cards: [],
      confidence: { level: "medium", rationale: "test" },
      signal_strength: { level: "low", score: 1, rationale: "test" },
    };
    expect(rich.sections[0].type).toBe("table");
  });
});
