export interface AllowedFacts {
  ids: string[];
  by_source: Record<string, string[]>;
}

type EvidenceLike = {
  source?: string;
  records?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

const pushUnique = (arr: string[], value: string) => {
  if (!arr.includes(value)) {
    arr.push(value);
  }
};

export function buildAllowedFacts(params: {
  selectedTools: string[];
  evidence: EvidenceLike[];
}): AllowedFacts {
  const ids: string[] = [];
  const by_source: Record<string, string[]> = {};

  for (const toolName of params.selectedTools) {
    const toolId = `tool:${toolName}`;
    pushUnique(ids, toolId);
    const key = `tool:${toolName}`;
    if (!by_source[key]) by_source[key] = [];
    pushUnique(by_source[key], toolId);
  }

  params.evidence.forEach((entry, index) => {
    const source = String(entry?.source || "unknown");
    const evidenceId = `evidence:${source}:${index}`;
    pushUnique(ids, evidenceId);
    if (!by_source[source]) by_source[source] = [];
    pushUnique(by_source[source], evidenceId);

    const records = Array.isArray(entry?.records)
      ? entry.records
      : Array.isArray(entry?.items)
        ? entry.items
        : Array.isArray(entry?.rows)
          ? entry.rows
          : [];

    records.forEach((_, i) => {
      const recordId = `record:${source}:${i}`;
      pushUnique(ids, recordId);
      pushUnique(by_source[source], recordId);
    });
  });

  return { ids, by_source };
}
