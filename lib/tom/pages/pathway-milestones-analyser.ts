import type { PathwayMilestonesPage, PathwayStageRow } from "./pathway-milestones";

export function isMilestonesQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("milestones") ||
    text.includes("pathway stages") ||
    text.includes("bottleneck") ||
    text.includes("stage delay") ||
    text.includes("average days between stages") ||
    text.includes("flow") ||
    text.includes("slowing down")
  );
}

export function detectMilestonesQueryKind(message: string): "bottleneck" | "longest_stage" | "distribution" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("bottleneck") || text.includes("slowing down")) return "bottleneck";
  if (text.includes("longest stage") || text.includes("longest wait stage") || text.includes("which stage has longest wait")) return "longest_stage";
  if (text.includes("distribution") || text.includes("pathway flow")) return "distribution";
  return "unknown";
}

export function longestStage(page: PathwayMilestonesPage): PathwayStageRow | null {
  if (!page.rows.length) return null;
  return [...page.rows].sort((a, b) => {
    if (b.avg_wait_days !== a.avg_wait_days) return b.avg_wait_days - a.avg_wait_days;
    if (b.count !== a.count) return b.count - a.count;
    return a.stage.localeCompare(b.stage);
  })[0] ?? null;
}

export function stageDistribution(page: PathwayMilestonesPage): Array<{ stage: string; count: number }> {
  return [...page.rows]
    .map((row) => ({ stage: row.stage, count: row.count }))
    .sort((a, b) => (b.count - a.count) || a.stage.localeCompare(b.stage));
}

export function bottleneckStages(page: PathwayMilestonesPage): PathwayStageRow[] {
  return [...page.rows]
    .sort((a, b) => {
      if (b.avg_wait_days !== a.avg_wait_days) return b.avg_wait_days - a.avg_wait_days;
      if (b.count !== a.count) return b.count - a.count;
      return a.stage.localeCompare(b.stage);
    })
    .slice(0, 2);
}

export function summaryBullets(page: PathwayMilestonesPage): string[] {
  const top = bottleneckStages(page);
  const byCount = stageDistribution(page);
  const bullets: string[] = [];
  if (top[0]) bullets.push(`Longest stage: ${top[0].stage} (${top[0].avg_wait_days}d)`);
  if (top[1]) bullets.push(`Next longest: ${top[1].stage} (${top[1].avg_wait_days}d)`);
  if (byCount[0]) bullets.push(`Highest volume stage: ${byCount[0].stage} (${byCount[0].count})`);
  return bullets.slice(0, 3);
}
