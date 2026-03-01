export type IntegrationEnvConfig = {
  epr?: string;
  roster?: string;
  inventory?: string;
  opcs?: string;
};

export const getIntegrationEnvConfig = (): IntegrationEnvConfig => {
  return {
    epr: process.env.TOM_EPR_CONNECTOR,
    roster: process.env.TOM_ROSTER_CONNECTOR,
    inventory: process.env.TOM_INVENTORY_CONNECTOR,
    opcs: process.env.TOM_OPCS_CONNECTOR,
  };
};
