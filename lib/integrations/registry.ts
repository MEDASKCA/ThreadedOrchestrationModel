import type {
  ConnectorConfig,
  ConnectorStatus,
  EPRConnector,
  EPRConnectorId,
  InventoryConnector,
  InventoryConnectorId,
  OPCSConnector,
  OPCSConnectorId,
  RosterConnector,
  RosterConnectorId,
} from "./types";
import { getIntegrationEnvConfig } from "./config";

const DEFAULT_CONFIG: ConnectorConfig = {
  epr: "sandbox",
  roster: "sandbox",
  inventory: "sandbox",
  opcs: "sandbox",
};

class IntegrationRegistry {
  private config: ConnectorConfig = { ...DEFAULT_CONFIG };
  private eprConnectors = new Map<string, EPRConnector>();
  private rosterConnectors = new Map<string, RosterConnector>();
  private inventoryConnectors = new Map<string, InventoryConnector>();
  private opcsConnectors = new Map<string, OPCSConnector>();
  private initialized = false;

  async initialize(config?: Partial<ConnectorConfig>) {
    if (config) this.config = { ...this.config, ...config };
    await this.loadConnectors();
    this.initialized = true;
  }

  private async loadConnectors() {
    await this.loadEprConnector(this.config.epr);
    await this.loadRosterConnector(this.config.roster);
    await this.loadInventoryConnector(this.config.inventory);
    await this.loadOpcsConnector(this.config.opcs);
  }

  private async loadEprConnector(id: EPRConnectorId) {
    if (this.eprConnectors.has(id)) return;
    let connector: EPRConnector;
    switch (id) {
      case "cerner": {
        const mod = await import("./epr/cerner");
        connector = mod.cernerConnector;
        break;
      }
      case "epic": {
        const mod = await import("./epr/epic");
        connector = mod.epicConnector;
        break;
      }
      case "nervecentre": {
        const mod = await import("./epr/nervecentre");
        connector = mod.nervecentreConnector;
        break;
      }
      case "sandbox":
      default: {
        const mod = await import("./epr/sandbox");
        connector = mod.eprSandbox;
        break;
      }
    }
    this.eprConnectors.set(id, connector);
  }

  private async loadRosterConnector(id: RosterConnectorId) {
    if (this.rosterConnectors.has(id)) return;
    let connector: RosterConnector;
    switch (id) {
      case "healthroster": {
        const mod = await import("./roster/healthroster");
        connector = mod.healthRosterConnector;
        break;
      }
      case "allocate": {
        const mod = await import("./roster/allocate");
        connector = mod.allocateConnector;
        break;
      }
      case "optima": {
        const mod = await import("./roster/optima");
        connector = mod.optimaConnector;
        break;
      }
      case "sandbox":
      default: {
        const mod = await import("./roster/sandbox");
        connector = mod.rosterSandbox;
        break;
      }
    }
    this.rosterConnectors.set(id, connector);
  }

  private async loadInventoryConnector(id: InventoryConnectorId) {
    if (this.inventoryConnectors.has(id)) return;
    let connector: InventoryConnector;
    switch (id) {
      case "oracle": {
        const mod = await import("./inventory/oracle");
        connector = mod.oracleConnector;
        break;
      }
      case "sandbox":
      default: {
        const mod = await import("./inventory/sandbox");
        connector = mod.inventorySandbox;
        break;
      }
    }
    this.inventoryConnectors.set(id, connector);
  }

  private async loadOpcsConnector(id: OPCSConnectorId) {
    if (this.opcsConnectors.has(id)) return;
    let connector: OPCSConnector;
    switch (id) {
      case "opcs4": {
        const mod = await import("./opcs/opcs4");
        connector = mod.opcsConnector;
        break;
      }
      case "sandbox":
      default: {
        const mod = await import("./opcs/sandbox");
        connector = mod.opcsSandbox;
        break;
      }
    }
    this.opcsConnectors.set(id, connector);
  }

  get epr(): EPRConnector {
    const connector = this.eprConnectors.get(this.config.epr);
    if (!connector) throw new Error("EPR connector not initialized");
    return connector;
  }

  get roster(): RosterConnector {
    const connector = this.rosterConnectors.get(this.config.roster);
    if (!connector) throw new Error("Roster connector not initialized");
    return connector;
  }

  get inventory(): InventoryConnector {
    const connector = this.inventoryConnectors.get(this.config.inventory);
    if (!connector) throw new Error("Inventory connector not initialized");
    return connector;
  }

  get opcs(): OPCSConnector {
    const connector = this.opcsConnectors.get(this.config.opcs);
    if (!connector) throw new Error("OPCS connector not initialized");
    return connector;
  }

  getConfig() {
    return { ...this.config };
  }

  async switchConnector(category: keyof ConnectorConfig, id: string) {
    switch (category) {
      case "epr":
        this.config.epr = id as EPRConnectorId;
        await this.loadEprConnector(id as EPRConnectorId);
        break;
      case "roster":
        this.config.roster = id as RosterConnectorId;
        await this.loadRosterConnector(id as RosterConnectorId);
        break;
      case "inventory":
        this.config.inventory = id as InventoryConnectorId;
        await this.loadInventoryConnector(id as InventoryConnectorId);
        break;
      case "opcs":
        this.config.opcs = id as OPCSConnectorId;
        await this.loadOpcsConnector(id as OPCSConnectorId);
        break;
    }
  }

  async getAllStatuses(): Promise<Record<string, ConnectorStatus>> {
    const [epr, roster, inventory, opcs] = await Promise.all([
      this.epr.getStatus(),
      this.roster.getStatus(),
      this.inventory.getStatus(),
      this.opcs.getStatus(),
    ]);
    return { epr, roster, inventory, opcs };
  }

  get isInitialized() {
    return this.initialized;
  }
}

export const connectorRegistry = new IntegrationRegistry();

export async function initializeIntegrations() {
  const envConfig = getIntegrationEnvConfig();
  await connectorRegistry.initialize({
    ...(envConfig.epr ? { epr: envConfig.epr as EPRConnectorId } : {}),
    ...(envConfig.roster ? { roster: envConfig.roster as RosterConnectorId } : {}),
    ...(envConfig.inventory ? { inventory: envConfig.inventory as InventoryConnectorId } : {}),
    ...(envConfig.opcs ? { opcs: envConfig.opcs as OPCSConnectorId } : {}),
  });
}
