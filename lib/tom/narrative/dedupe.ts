export function dedupeLines(text: string): string {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const collapsedLead = line.replace(/^(\w+)([,\s]+)\1\b/i, "$1");
    const key = collapsedLead.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(collapsedLead);
  }

  return out.join("\n");
}
