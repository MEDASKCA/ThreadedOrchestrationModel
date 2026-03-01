const EXPLAIN_PATTERNS = [
  /\bwhy\b/i,
  /\bexplain\b/i,
  /\bhow did you get\b/i,
  /\bshow your working\b/i,
  /\bwhat does that mean\b/i,
  /\bbreak it down\b/i,
  /\bhow do you know\b/i,
];

export function isExplainRequest(message: string): boolean {
  const text = String(message || "").trim();
  if (!text) return false;
  return EXPLAIN_PATTERNS.some((pattern) => pattern.test(text));
}
