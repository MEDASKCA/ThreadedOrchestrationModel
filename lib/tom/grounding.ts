import type { RichResponse, RichDataUsed } from "@/lib/tom/rich-response";

export const buildAllowedNumbers = (values: Array<number | string | null | undefined>) => {
  const set = new Set<string>();
  values.forEach((value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      set.add(String(Math.round(value)));
      set.add(String(value));
    }
    if (typeof value === "string") {
      const matches = value.match(/-?\d+(\.\d+)?/g) || [];
      matches.forEach((token) => set.add(token));
    }
  });
  return set;
};

export const responseContainsUnknownNumbers = (text: string, allowed: Set<string>) => {
  const matches = text.match(/-?\d+(\.\d+)?/g) || [];
  return matches.some((token) => !allowed.has(token));
};

export const collectRichText = (rich: RichResponse) => {
  const texts: string[] = [];
  texts.push(rich.title, rich.summary);
  rich.sections.forEach((s) => {
    texts.push(s.heading, s.body);
    s.bullets.forEach((b) => texts.push(b));
  });
  rich.tables.forEach((t) => {
    if (t.title) texts.push(t.title);
    t.columns.forEach((c) => texts.push(c));
    t.rows.forEach((row) => row.forEach((cell) => texts.push(cell)));
  });
  rich.next_actions.forEach((a) => {
    texts.push(a.label, a.rationale, a.action_type);
  });
  rich.context_cards.forEach((c) => {
    texts.push(c.title);
    if (c.detail) texts.push(c.detail);
    if (c.meta) texts.push(c.meta);
  });
  texts.push(rich.confidence.level, rich.confidence.rationale);
  return texts.join(" ");
};

export const dedupeSources = (data_used: RichDataUsed[]) => {
  return Array.from(new Set(data_used.map((item) => item.source)));
};
