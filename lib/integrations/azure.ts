export type AzureSqlConfig = {
  server: string;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
};

export const getAzureSqlConfig = (): AzureSqlConfig => ({
  server: process.env.AZURE_SQL_SERVER || "",
  database: process.env.AZURE_SQL_DATABASE || "",
  user: process.env.AZURE_SQL_USER || "",
  password: process.env.AZURE_SQL_PASSWORD || "",
  encrypt: process.env.AZURE_SQL_ENCRYPT !== "false",
});

export const isAzureConfigured = (): boolean => {
  const cfg = getAzureSqlConfig();
  return Boolean(cfg.server && cfg.database && cfg.user && cfg.password);
};
