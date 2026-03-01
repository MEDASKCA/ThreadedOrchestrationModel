const EXPLORE_PHRASES = [
  "show me any data",
  "show me what you have",
  "what data do you have",
  "what do you know",
  "what can you show me",
  "overview",
  "anything useful",
  "start anywhere",
  "surprise me",
] as const;

const SECTION_KEYWORDS = ["operations", "logistics", "planning", "collaboration", "intelligence", "settings"] as const;

const HIGH_VALUE_TERMS = ["ptl", "rtt", "waiting", "roster", "inventory", "alerts", "audit"] as const;

export function isExploreQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return EXPLORE_PHRASES.some((phrase) => text.includes(phrase));
}

export function inferExploreSection(message: string): string | null {
  const text = String(message || "").toLowerCase();
  for (const section of SECTION_KEYWORDS) {
    if (text.includes(section)) return section;
  }
  return null;
}

export function selectExploreViews(
  registry: Array<{ id: string; label: string; section: string; implemented: boolean }>,
  section: string | null,
): string[] {
  const scoped = section
    ? registry.filter((view) => view.section === section)
    : [...registry];
  const implemented = scoped.filter((view) => view.implemented);
  const sorted = implemented.sort((a, b) => {
    const aLabel = a.label.toLowerCase();
    const bLabel = b.label.toLowerCase();
    const aBoost = HIGH_VALUE_TERMS.some((term) => aLabel.includes(term)) ? 1 : 0;
    const bBoost = HIGH_VALUE_TERMS.some((term) => bLabel.includes(term)) ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    return a.label.localeCompare(b.label);
  });
  if (sorted.length === 0) return [];

  const selected = [sorted[0].id];
  const second = sorted[1];
  if (second && second.section !== sorted[0].section) {
    selected.push(second.id);
    return selected;
  }
  if (second && sorted[0].section === "operations" && second.section === "operations") {
    selected.push(second.id);
  }
  return selected;
}
