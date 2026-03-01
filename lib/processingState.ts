export type ProcessingState = {
  type: "processing_state";
  text: string;
  category: string;
  domain: string;
};

function make(text: string, category: string, domain: string): ProcessingState {
  return { type: "processing_state", text, category, domain };
}

/** Maps a user prompt to an appropriate NHS-grade processing state for UI animation. */
export function computeProcessingState(prompt: string): ProcessingState {
  const p = prompt.toLowerCase();

  // ── Access & Pathways ─────────────────────────────────────────────────────
  if (/\b(ptl|rtt|2ww|waiting list|pathway|breach|clock|referral|longest wait|overdue patient|cancer path)\b/.test(p)) {
    if (/\b(longest|worst|urgent|priority|who.*wait)\b/.test(p))
      return make("Identifying longest waiters…", "Prioritise", "Access & Pathways");
    if (/\b(breach|breaching|breach track)\b/.test(p))
      return make("Checking breach thresholds…", "Risk & Escalation", "Access & Pathways");
    if (/\b(clock start|clock stop|validate|validation|data quality)\b/.test(p))
      return make("Validating clock events…", "Validate", "Access & Pathways");
    if (/\b(referral|triage|2ww|cancer)\b/.test(p))
      return make("Mapping referral progression…", "Locate", "Access & Pathways");
    return make("Scanning pathway durations…", "Prioritise", "Access & Pathways");
  }

  // ── Capacity ──────────────────────────────────────────────────────────────
  if (/\b(bed|icu|theatre capacity|clinic slot|session planner|occupancy|surge|forward capacity|7.day capacity)\b/.test(p)
    || (/\bcapacity\b/.test(p) && !/\bcoverage\b/.test(p))) {
    if (/\b(surge|pressure|risk)\b/.test(p))
      return make("Evaluating surge exposure…", "Risk & Escalation", "Capacity");
    if (/\b(7.day|7 day|tomorrow|forward|next week|outlook)\b/.test(p))
      return make("Reviewing 7-day outlook…", "Forecast", "Capacity");
    if (/\b(slot|available|free|book)\b/.test(p))
      return make("Checking slot availability…", "Locate", "Capacity");
    return make("Assessing live occupancy levels…", "Forecast", "Capacity");
  }

  // ── Activity & Performance ────────────────────────────────────────────────
  if (/\b(utilisation|utilization|dna|did not attend|cancellation|performance|variance|activity vs plan|target)\b/.test(p)) {
    if (/\b(dna|did not attend)\b/.test(p))
      return make("Analysing DNA impact…", "Explain variance", "Activity & Performance");
    if (/\b(cancel)\b/.test(p))
      return make("Assessing cancellation drivers…", "Explain variance", "Activity & Performance");
    if (/\b(utilisation|utilization)\b/.test(p))
      return make("Reviewing utilisation variance…", "Explain variance", "Activity & Performance");
    return make("Comparing activity versus plan…", "Explain variance", "Activity & Performance");
  }

  // ── Procedures ────────────────────────────────────────────────────────────
  if (/\b(procedure|pre-op|pre op|checklist|opcs|procedure coding|duration trend|theatre list|backlog by procedure)\b/.test(p)) {
    if (/\b(pre-op|pre op|checklist|readiness)\b/.test(p))
      return make("Reviewing pre-op readiness…", "Validate", "Procedures");
    if (/\b(backlog)\b/.test(p))
      return make("Mapping backlog by procedure…", "Prioritise", "Procedures");
    if (/\b(duration|time|trend)\b/.test(p))
      return make("Analysing duration trends…", "Explain variance", "Procedures");
    return make("Checking checklist status…", "Validate", "Procedures");
  }

  // ── Flow & Escalation ─────────────────────────────────────────────────────
  if (/\b(delayed discharge|internal transfer|blocked bed|opel|escalation level|pressure indicator|same.day cancel|flow bottleneck)\b/.test(p)
    || (/\b(escalat|pressure)\b/.test(p) && !/\b(cost|price)\b/.test(p))) {
    if (/\b(bottleneck|block|blocked bed)\b/.test(p))
      return make("Identifying flow bottlenecks…", "Risk & Escalation", "Flow & Escalation");
    if (/\b(opel|pressure|escalat)\b/.test(p))
      return make("Scanning pressure indicators…", "Risk & Escalation", "Flow & Escalation");
    return make("Tracing dependency blocks…", "Risk & Escalation", "Flow & Escalation");
  }

  // ── Workforce / Logistics ─────────────────────────────────────────────────
  if (/\b(staff|roster|rota|shift|absence|leave|sick|allocation|coverage gap|workforce|headcount|deploy|staffing)\b/.test(p)) {
    if (/\b(absence|leave|sick|off sick)\b/.test(p))
      return make("Assessing absence impact…", "Risk & Escalation", "Workforce");
    if (/\b(allocation|assign|deploy)\b/.test(p))
      return make("Optimising staff allocation…", "Co-ordinate work", "Workforce");
    return make("Reviewing coverage gaps…", "Risk & Escalation", "Workforce");
  }

  // ── Inventory & Equipment ─────────────────────────────────────────────────
  if (/\b(stock|inventory|equipment|asset|batch|expiry|expire|procurement|supply|catalogue|warehouse|product)\b/.test(p)) {
    if (/\b(expiry|expire|batch)\b/.test(p))
      return make("Validating batch and expiry…", "Validate", "Inventory & Equipment");
    if (/\b(procurement|order|purchase|supply chain)\b/.test(p))
      return make("Reviewing procurement pipeline…", "Forecast", "Inventory & Equipment");
    if (/\b(asset|track|movement|location)\b/.test(p))
      return make("Tracking asset movement…", "Locate", "Inventory & Equipment");
    return make("Checking stock safety thresholds…", "Risk & Escalation", "Inventory & Equipment");
  }

  // ── Collaboration / Deliverables ──────────────────────────────────────────
  if (/\b(deliverable|overdue|at risk|escalat|task|assigned|thread|forum|huddle|briefing|governance log)\b/.test(p)) {
    if (/\b(overdue|late|missed|deadline)\b/.test(p))
      return make("Scanning overdue dependencies…", "Co-ordinate work", "Collaboration");
    if (/\b(at risk|critical)\b/.test(p))
      return make("Reviewing at-risk deliverables…", "Co-ordinate work", "Collaboration");
    if (/\b(huddle|briefing)\b/.test(p))
      return make("Structuring prioritised overview…", "Co-ordinate work", "Collaboration");
    return make("Consolidating cross-system signals…", "Co-ordinate work", "Collaboration");
  }

  // ── Governance / Audit ────────────────────────────────────────────────────
  if (/\b(audit|governance|audit trail|compliance|policy|regulation|audit log|tom audit)\b/.test(p)) {
    if (/\b(audit trail|tom audit)\b/.test(p))
      return make("Compiling TOM audit trail…", "Validate", "Governance");
    return make("Preparing audit-aligned summary…", "Validate", "Governance");
  }

  // ── Intelligence / Analytics ──────────────────────────────────────────────
  if (/\b(analytic|insight|report|trend|forecast|predict|overview|intelligence|summary)\b/.test(p))
    return make("Generating governance-aligned insight…", "Forecast", "Intelligence");

  // ── Generic fallbacks ──────────────────────────────────────────────────────
  if (/\b(show|display|view|open|load|get)\b/.test(p))
    return make("Consolidating cross-system signals…", "Locate", "Operations");
  if (/\b(check|status|update|latest|current|what)\b/.test(p))
    return make("Integrating live system inputs…", "Locate", "Operations");

  return make("Applying agreed operational thresholds…", "Locate", "Operations");
}

/**
 * Returns 2 additional related state texts to cycle through while waiting.
 * Keeps the "Claude thinking" vibe without needing the LLM to stream multiple states.
 */
export function getRelatedStates(primary: ProcessingState): string[] {
  const domain = primary.domain;
  const pool: Record<string, string[]> = {
    "Access & Pathways": ["Scanning pathway durations…", "Checking breach thresholds…", "Structuring prioritised overview…"],
    "Capacity": ["Assessing live occupancy levels…", "Mapping capacity constraints…", "Reviewing 7-day outlook…"],
    "Activity & Performance": ["Comparing activity versus plan…", "Reviewing utilisation variance…", "Summarising performance signals…"],
    "Procedures": ["Checking checklist status…", "Reviewing pre-op readiness…", "Analysing duration trends…"],
    "Flow & Escalation": ["Scanning pressure indicators…", "Identifying flow bottlenecks…", "Flagging capacity alerts…"],
    "Workforce": ["Reviewing coverage gaps…", "Assessing absence impact…", "Optimising staff allocation…"],
    "Inventory & Equipment": ["Checking stock safety thresholds…", "Validating batch and expiry…", "Reviewing procurement pipeline…"],
    "Collaboration": ["Consolidating cross-system signals…", "Scanning overdue dependencies…", "Updating governance log view…"],
    "Governance": ["Preparing audit-aligned summary…", "Validating key data fields…", "Compiling TOM audit trail…"],
    "Intelligence": ["Generating governance-aligned insight…", "Structuring prioritised overview…", "Validating key data fields…"],
  };
  const candidates = (pool[domain] ?? ["Integrating live system inputs…", "Consolidating cross-system signals…", "Structuring prioritised overview…"])
    .filter(t => t !== primary.text);
  return candidates.slice(0, 2);
}
