import type { ReasoningTrace } from "@/lib/tom/reasoning/trace";

type TraceConflict = NonNullable<ReasoningTrace["conflicts"]>[number];

export function detectAuthorityConflicts(
  tools: string[],
  getAuthorityForToolFn: (toolName: string) => string,
): { domains: string[]; conflicts: ReasoningTrace["conflicts"] } {
  const domainsByTool = tools.map((tool) => ({ tool, domain: getAuthorityForToolFn(tool) }));
  const domains = Array.from(new Set(domainsByTool.map((entry) => entry.domain).filter((domain) => domain !== "unknown")));
  const conflicts: TraceConflict[] = [];

  if (domains.length >= 2) {
    conflicts.push({
      kind: "multi_domain",
      severity: "medium",
      details: "selected tools span multiple authority domains",
      tools,
      domains,
    });
  }

  const unknownTools = domainsByTool.filter((entry) => entry.domain === "unknown").map((entry) => entry.tool);
  if (unknownTools.length > 0) {
    conflicts.push({
      kind: "unknown_tool",
      severity: "low",
      details: "one or more selected tools have unknown authority",
      tools: unknownTools,
    });
  }

  return { domains, conflicts };
}
