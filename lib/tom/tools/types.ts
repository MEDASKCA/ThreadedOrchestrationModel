export type ToolPermission = "read:ptl" | "read:alerts" | "read:anomalies" | "read:roster" | "read:comms" | "read:pas" | "read:inventory" | "read:view" | "read:public";

export type ToolDefinition<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  permission: ToolPermission;
  auditCategory: string;
  run: (input: Input) => Promise<Output>;
};

export type ToolResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  source?: string;
};
