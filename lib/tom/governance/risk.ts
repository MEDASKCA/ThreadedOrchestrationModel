import { getToolByName } from "@/lib/tom/tools/registry";

export type RiskLevel = "low" | "medium" | "high";

export interface RiskPolicyDecision {
  risk: RiskLevel;
  reason: string;
  requires_approval: boolean;
}

export function assessActionRisk(action: { type: string; payload?: any }): RiskPolicyDecision {
  const type = String(action.type || "").toLowerCase();
  if (type === "open_view" || type === "open_canvas" || type === "pin") {
    return { risk: "low", reason: "ui_orchestration_only", requires_approval: false };
  }
  if (/(create|update|delete|assign|write|save)/.test(type)) {
    return { risk: "high", reason: "state_changing_action", requires_approval: true };
  }
  return { risk: "medium", reason: "unknown_action_type_safe_default", requires_approval: true };
}

export function assessToolRisk(toolName: string): RiskPolicyDecision {
  const tool = getToolByName(toolName);
  if (!tool) {
    return { risk: "medium", reason: "unknown_tool_safe_default", requires_approval: true };
  }
  const permission = String((tool as any).permission || "");
  if (permission.startsWith("write:")) {
    return { risk: "high", reason: "write_tool_permission", requires_approval: true };
  }
  return { risk: "low", reason: "read_only_tool", requires_approval: false };
}
