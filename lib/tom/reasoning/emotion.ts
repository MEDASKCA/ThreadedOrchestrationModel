export function enforceSingleQuestionText(params: {
  title: string;
  summary: string;
  bullets: string[];
  question: string;
}) {
  const stripQuestions = (value: string) => value.replace(/\?/g, ".");
  const title = stripQuestions(params.title).trim();
  const baseSummary = stripQuestions(params.summary).trim();
  const bullets = params.bullets.map((bullet) => stripQuestions(bullet).trim());
  const q = params.question.trim().replace(/[?!.]*$/, "");
  const summary = `${baseSummary} ${q}?`.replace(/\s+/g, " ").trim();
  return { title, summary, bullets };
}

export function resolveEmotionActionRoute(message: string): "operations_overview" | "planning_overview" | "explore_mode" | null {
  const text = String(message || "").toLowerCase().trim();
  if (!text) return null;
  if (text === "operations" || text.includes("open operations")) return "operations_overview";
  if (text === "planning" || text.includes("open planning")) return "planning_overview";
  if (text.includes("show something useful") || text.includes("useful")) return "explore_mode";
  return null;
}
