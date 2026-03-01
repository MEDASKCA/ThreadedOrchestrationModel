import { describe, expect, it } from "vitest";
import { evaluateAlerts } from "../lib/tom/alerts";
import { pathwayFixtures } from "../lib/pathways/fixtures";
import { inventorySandbox } from "../lib/integrations/inventory/sandbox";

describe("TOM alerts", () => {
  it("returns alerts when thresholds are met", async () => {
    const stock = await inventorySandbox.getStock("Royal Infirmary");
    const alerts = evaluateAlerts(pathwayFixtures, stock);
    expect(alerts.length).toBeGreaterThan(0);
  });
});
