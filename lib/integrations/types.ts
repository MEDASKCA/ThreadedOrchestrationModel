export type ConnectorStatus = {
  connected: boolean;
  lastSync?: string | null;
  error?: string | null;
  latencyMs?: number | null;
  environment?: "sandbox" | "uat" | "production";
};

export type EPRConnectorId = "cerner" | "epic" | "nervecentre" | "sandbox";
export type RosterConnectorId = "healthroster" | "allocate" | "optima" | "sandbox";
export type InventoryConnectorId = "oracle" | "sandbox";
export type OPCSConnectorId = "opcs4" | "sandbox";

export type ConnectorConfig = {
  epr: EPRConnectorId;
  roster: RosterConnectorId;
  inventory: InventoryConnectorId;
  opcs: OPCSConnectorId;
};

export type PathwayRecord = import("@/lib/pathways/schema").Pathway;

export type EPRConnector = {
  id: EPRConnectorId;
  name: string;
  getStatus: () => Promise<ConnectorStatus>;
  getPathways: (filters?: Partial<PathwayRecord>) => Promise<PathwayRecord[]>;
  getPatients?: (patientIds: string[]) => Promise<Record<string, unknown>>;
};

export type RosterShift = {
  id: string;
  staffName: string;
  role: string;
  site: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type RosterConnector = {
  id: RosterConnectorId;
  name: string;
  getStatus: () => Promise<ConnectorStatus>;
  getShifts: (site: string, date: string) => Promise<RosterShift[]>;
};

export type StockItem = {
  id: string;
  name: string;
  category: string;
  site: string;
  quantity: number;
  minLevel: number;
  unit: string;
};

export type InventoryConnector = {
  id: InventoryConnectorId;
  name: string;
  getStatus: () => Promise<ConnectorStatus>;
  getStock: (site: string) => Promise<StockItem[]>;
};

export type OPCSEntry = {
  code: string;
  description: string;
  group?: string;
};

export type OPCSConnector = {
  id: OPCSConnectorId;
  name: string;
  getStatus: () => Promise<ConnectorStatus>;
  search: (query: string) => Promise<OPCSEntry[]>;
};
