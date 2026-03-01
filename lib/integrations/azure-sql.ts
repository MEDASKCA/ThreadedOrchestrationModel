export type AzureSqlQueryResult<T> = {
  rows: T[];
  elapsedMs: number;
};

export async function queryAzureSql<T = Record<string, unknown>>(
  _sql: string,
  _params: Record<string, unknown> = {},
): Promise<AzureSqlQueryResult<T>> {
  // Placeholder: real Azure SQL client should be wired here.
  // Keep deterministic behaviour for MVP.
  return { rows: [], elapsedMs: 0 };
}
