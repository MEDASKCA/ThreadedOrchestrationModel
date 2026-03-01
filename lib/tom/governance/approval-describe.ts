export function buildApprovalUserSummary(action: { type: string; payload?: any }) {
  const type = String(action.type || "").toLowerCase();
  if (type.includes("save") && type.includes("plan")) {
    return "Save the current session plan to Planning.";
  }
  if (type.includes("update") && type.includes("session")) {
    return "Update the current Planning session.";
  }
  if (type.includes("create") && type.includes("session")) {
    return "Create a new Planning session.";
  }
  if (type.includes("update") && (type.includes("staff") || type.includes("roster") || type.includes("shift"))) {
    return "Update staffing assignment for the selected shift.";
  }
  return "Apply a change to the system (details below).";
}

export function shouldRouteApprovalHelp(params: { hasPendingApproval: boolean; message: string }) {
  if (!params.hasPendingApproval) return false;
  const t = params.message.toLowerCase();
  return (
    t.includes("what do you want me to confirm") ||
    t.includes("what am i confirming") ||
    t.includes("confirm what") ||
    t.includes("what is this approval") ||
    t.includes("what will change") ||
    t.includes("what happens if i approve") ||
    t.includes("why approve")
  );
}

export function buildApprovalPreview(action: { type: string; payload?: any }) {
  const payload = action.payload && typeof action.payload === "object" ? action.payload : {};
  const changes = Object.entries(payload).map(([field, to]) => ({ field, to }));
  const target =
    typeof (payload as any).target === "string"
      ? String((payload as any).target)
      : action.type.includes("session")
        ? "Planning session"
        : action.type.includes("roster")
          ? "Roster"
          : action.type.includes("inventory")
            ? "Inventory"
            : undefined;
  return {
    target,
    changes: changes.length > 0 ? changes : [{ field: "(details)", to: "not available" }],
    reversible: undefined as boolean | undefined,
  };
}
