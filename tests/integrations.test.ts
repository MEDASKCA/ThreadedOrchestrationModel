import { describe, expect, it } from "vitest";
import { connectorRegistry, initializeIntegrations } from "../lib/integrations/registry";

describe("Integration registry", () => {
  it("initializes sandbox connectors", async () => {
    await initializeIntegrations();
    const statuses = await connectorRegistry.getAllStatuses();
    expect(statuses.epr.connected).toBeDefined();
    expect(statuses.roster.connected).toBeDefined();
    expect(statuses.inventory.connected).toBeDefined();
    expect(statuses.opcs.connected).toBeDefined();
  });
});
