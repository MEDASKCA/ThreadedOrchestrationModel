import type { RichResponse, RichDataUsed } from "@/lib/tom/rich-response";
import { collectRichText, responseContainsUnknownNumbers, buildAllowedNumbers } from "@/lib/tom/grounding";

const IGNORE_PHRASES = new Set([
  "PTL summary",
  "Operational view",
  "Access & Pathways",
  "Royal Infirmary",
]);

const extractPossibleNames = (text: string) => {
  const matches = text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g) || [];
  return matches.filter((m) => !IGNORE_PHRASES.has(m));
};

const textHasClaimsWithoutEvidence = (text: string) => {
  const hasNumber = /\b\d[\d,]*(\.\d+)?\b/.test(text);
  const hasMetricWords = /\b(count|total|rate|breach|waiting|alerts|anomal(?:y|ies)|patients?|records?)\b/i.test(text);
  return hasNumber || hasMetricWords;
};

const runVerifier = (params: {
  response: RichResponse;
  evidence: RichDataUsed[];
  allowedFactIds?: string[];
  toolsUsed?: boolean;
  provenanceUsedFactIds?: string[];
}) => {
  const rich = params.response;
  const dataUsed = params.evidence;
  const text = collectRichText(rich);
  const allowedNumbers = buildAllowedNumbers(dataUsed.map((d) => d.value));
  const numberViolation = responseContainsUnknownNumbers(text, allowedNumbers);

  const allowedNames = new Set(
    dataUsed
      .filter((d) => (d.label || "").toLowerCase().includes("patient"))
      .map((d) => String(d.value))
      .filter((v) => v && v !== "undefined"),
  );
  const foundNames = extractPossibleNames(text);
  const nameViolation = foundNames.some((name) => !allowedNames.has(name));

  const reasons: string[] = [];
  if (numberViolation) reasons.push("unknown_numbers");
  if (nameViolation) reasons.push("unknown_names");
  if (params.toolsUsed && (params.allowedFactIds?.length ?? 0) === 0) {
    reasons.push("no_allowed_facts_for_tool_response");
  }
  if (dataUsed.length === 0 && textHasClaimsWithoutEvidence(text)) {
    reasons.push("claims_without_evidence");
  }
  const provenanceFactIds = params.provenanceUsedFactIds ?? params.response.provenance?.used_fact_ids;
  if (provenanceFactIds && params.allowedFactIds) {
    const allowed = new Set(params.allowedFactIds);
    const invalid = provenanceFactIds.some((id) => !allowed.has(id));
    if (invalid) {
      reasons.push("used_facts_not_subset_of_allowed");
    }
  }

  return { ok: reasons.length === 0, reasons, numberViolation, nameViolation };
};

export function verifyResponse(rich: RichResponse, dataUsed: RichDataUsed[]): ReturnType<typeof runVerifier>;
export function verifyResponse(params: {
  response: RichResponse;
  evidence: RichDataUsed[];
  allowedFactIds?: string[];
  toolsUsed?: boolean;
  provenanceUsedFactIds?: string[];
}): ReturnType<typeof runVerifier>;
export function verifyResponse(
  arg1:
    | RichResponse
    | {
      response: RichResponse;
      evidence: RichDataUsed[];
      allowedFactIds?: string[];
      toolsUsed?: boolean;
      provenanceUsedFactIds?: string[];
    },
  arg2?: RichDataUsed[],
) {
  if (arg2) {
    return runVerifier({ response: arg1 as RichResponse, evidence: arg2 });
  }
  return runVerifier(arg1 as {
    response: RichResponse;
    evidence: RichDataUsed[];
    allowedFactIds?: string[];
    toolsUsed?: boolean;
    provenanceUsedFactIds?: string[];
  });
}
