export type ApprovalDecision = "approve" | "deny" | "unknown";

export function normalizeApprovalChoice(input: string): ApprovalDecision {
  const text = input.trim().toLowerCase();
  if (["yes", "y", "approve", "approved", "ok", "confirm"].includes(text)) return "approve";
  if (["no", "n", "deny", "denied", "cancel", "stop"].includes(text)) return "deny";
  return "unknown";
}
