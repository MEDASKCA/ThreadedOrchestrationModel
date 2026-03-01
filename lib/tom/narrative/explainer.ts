export type ExplainMode = "concise" | "expanded";
export type ExplainerPageType = "ptl" | "waiting_list" | "rtt" | "cancer_2ww" | "referrals" | "triage" | "breach_tracking" | "pathway_milestones" | "clock_events" | "data_quality";

export type ExplanationParams = {
  mode: ExplainMode;
  page_type: ExplainerPageType;
  finding_type: string;
  finding_data: Record<string, unknown>;
  evidence_summary?: string;
  page_labels?: string[];
};

export function buildExplanation(params: ExplanationParams): { title?: string; summary: string; bullets?: string[] } {
  const checkedPages = params.page_labels && params.page_labels.length > 0
    ? params.page_labels.join(", ")
    : pageTypeLabel(params.page_type);
  const checkedLine = `Checked: ${checkedPages}`;

  if (params.mode === "concise") {
    const conciseSummary = conciseSummaryFor(params);
    return {
      title: conciseTitleFor(params),
      summary: `${conciseSummary} ${checkedLine}`.trim(),
      bullets: conciseBulletsFor(params).slice(0, 3),
    };
  }

  const expandedSummary = conciseSummaryFor(params);
  const bullets = expandedBulletsFor(params).slice(0, 6);
  return {
    title: conciseTitleFor(params),
    summary: expandedSummary,
    bullets: [checkedLine, ...bullets].slice(0, 6),
  };
}

const pageTypeLabel = (pageType: ExplainerPageType): string => {
  if (pageType === "ptl") return "Operations → Access & Pathways → PTL";
  if (pageType === "waiting_list") return "Operations → Access & Pathways → Waiting List Management";
  if (pageType === "cancer_2ww") return "Operations → Access & Pathways → Cancer Pathways (2WW)";
  if (pageType === "referrals") return "Operations → Access & Pathways → Referral Management";
  if (pageType === "triage") return "Operations → Access & Pathways → Triage Status";
  if (pageType === "breach_tracking") return "Operations → Access & Pathways → Breach Tracking";
  if (pageType === "pathway_milestones") return "Operations → Access & Pathways → Pathway Milestones";
  if (pageType === "clock_events") return "Operations → Access & Pathways → Clock Starts/Stops";
  if (pageType === "data_quality") return "Operations → Access & Pathways → Validation & Data Quality";
  return "Operations → Access & Pathways → RTT Monitoring";
};

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toText = (v: unknown, fallback = "Unknown"): string => {
  const out = String(v ?? "").trim();
  return out.length > 0 ? out : fallback;
};

const conciseTitleFor = (params: ExplanationParams): string => {
  if (params.page_type === "ptl") {
    if (params.finding_type === "longest_waiter") return "PTL longest waiter";
    if (params.finding_type.includes("breach")) return "PTL breaches";
    return "PTL summary";
  }
  if (params.page_type === "waiting_list") {
    if (params.finding_type === "capacity_gap") return "Capacity gap";
    if (params.finding_type === "max_avg_wait") return "Highest average wait";
    return "Waiting list summary";
  }
  if (params.page_type === "cancer_2ww") {
    return "Cancer Pathways (2WW)";
  }
  if (params.page_type === "referrals") {
    return "Referral Management";
  }
  if (params.page_type === "triage") {
    return "Triage Status";
  }
  if (params.page_type === "breach_tracking") {
    return "Breach Tracking";
  }
  if (params.page_type === "pathway_milestones") {
    return "Pathway Milestones";
  }
  if (params.page_type === "clock_events") {
    return "Clock Starts/Stops";
  }
  if (params.page_type === "data_quality") {
    return "Validation & Data Quality";
  }
  if (params.finding_type.includes("breach")) return "RTT breaches";
  return "RTT compliance";
};

const conciseSummaryFor = (params: ExplanationParams): string => {
  const d = params.finding_data;
  if (params.page_type === "ptl") {
    if (params.finding_type === "no_rows") return "The PTL page returned no rows.";
    if (params.finding_type === "longest_waiter") {
      const name = toText(d.patient_name, "Unknown patient");
      const wait = toNum(d.waiting_days);
      return wait !== null ? `${name} is currently the longest waiter at ${wait} days.` : "Longest waiter was identified from PTL rows.";
    }
    const total = toNum(d.total);
    if (total !== null) return `PTL currently shows ${total} patient rows.`;
    const breaches = toNum(d.breaches);
    if (breaches !== null) return `PTL currently shows ${breaches} breaching rows.`;
    return "PTL findings were derived from patient-level rows.";
  }
  if (params.page_type === "waiting_list") {
    if (params.finding_type === "no_rows") return "The waiting list page returned no rows.";
    if (params.finding_type === "max_avg_wait") {
      const specialty = toText(d.specialty, "Unknown specialty");
      const avg = toNum(d.avg_wait_days);
      return avg !== null ? `${specialty} has the highest average wait at ${avg} days.` : `${specialty} has the highest average wait in this view.`;
    }
    if (params.finding_type === "capacity_gap") {
      const specialty = toText(d.specialty, "Unknown specialty");
      const gap = toNum(d.capacity_gap);
      return gap !== null ? `${specialty} has the largest capacity gap at ${gap}.` : "Capacity gaps are present in this waiting-list view.";
    }
    const total = toNum(d.total_waiting_list);
    return total !== null ? `Total waiting list is ${total}.` : "Waiting-list totals were derived from grouped specialty rows.";
  }
  if (params.page_type === "cancer_2ww") {
    if (params.finding_type === "no_data") return "Cancer Pathways (2WW) returned no data for the current filter.";
    const active = toNum(d.active_referrals);
    const breaches = toNum(d.total_breaches);
    const urgentDx = toNum(d.urgent_diagnostics_pending);
    const escalations = toNum(d.safety_escalations);
    const parts = [
      active !== null ? `active 2WW referrals ${active}` : null,
      breaches !== null ? `breaches ${breaches}` : null,
      urgentDx !== null ? `urgent diagnostics pending ${urgentDx}` : null,
      escalations !== null ? `safety escalations ${escalations}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? `Cancer 2WW key signals: ${parts.join(", ")}.` : "Cancer 2WW findings were derived from page tiles and specialty rows.";
  }
  if (params.page_type === "referrals") {
    if (params.finding_type === "no_data") return "Referral Management returned no data for the current filter.";
    const newReferrals = toNum(d.new_referrals);
    const awaiting = toNum(d.awaiting_triage);
    const overdue = toNum(d.overdue_triage);
    const conversion = toNum(d.conversion_rate);
    const parts = [
      newReferrals !== null ? `new referrals ${newReferrals}` : null,
      awaiting !== null ? `awaiting triage ${awaiting}` : null,
      overdue !== null ? `overdue triage ${overdue}` : null,
      conversion !== null ? `conversion rate ${conversion}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? `Referral intake/triage signals: ${parts.join(", ")}.` : "Referral Management findings were derived from page tiles and referral rows.";
  }
  if (params.page_type === "triage") {
    if (params.finding_type === "no_data") return "Triage Status returned no data for the current filter.";
    const awaiting = toNum(d.awaiting_consultant_review);
    const overdue = toNum(d.overdue_triage);
    const clarification = toNum(d.clarification_requested);
    const reprioritization = toNum(d.reprioritization_pending);
    const parts = [
      awaiting !== null ? `awaiting consultant review ${awaiting}` : null,
      overdue !== null ? `overdue triage ${overdue}` : null,
      clarification !== null ? `clarification requested ${clarification}` : null,
      reprioritization !== null ? `reprioritization pending ${reprioritization}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? `Triage queue signals: ${parts.join(", ")}.` : "Triage Status findings were derived from queue tiles and case rows.";
  }
  if (params.page_type === "breach_tracking") {
    if (params.finding_type === "no_data") return "No breach cases returned for the current filter.";
    const total = toNum(d.total_breaches);
    const repeat = toNum(d.repeat_breach_cases);
    const unassigned = toNum(d.unassigned_breaches);
    const parts = [
      total !== null ? `total breaches ${total}` : null,
      repeat !== null ? `repeat breach cases ${repeat}` : null,
      unassigned !== null ? `unassigned breaches ${unassigned}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0 ? `Breach tracking signals: ${parts.join(", ")}.` : "Breach Tracking findings were derived from breach case rows and tiles.";
  }
  if (params.page_type === "pathway_milestones") {
    if (params.finding_type === "no_data") return "Pathway Milestones returned no stage data for the current filter.";
    const longestStage = toText(d.longest_stage, "");
    const longestWait = toNum(d.longest_avg_wait_days);
    return longestStage && longestWait !== null
      ? `Longest stage delay is ${longestStage} at ${longestWait} days average.`
      : "Pathway flow and bottleneck findings were derived from stage-level rows.";
  }
  if (params.page_type === "clock_events") {
    if (params.finding_type === "no_data") return "Clock Starts/Stops returned no anomalies for the current filter.";
    const starts = toNum(d.clock_start_anomalies);
    const suspended = toNum(d.suspended_clocks);
    const duplicates = toNum(d.duplicate_clocks);
    const overrides = toNum(d.manual_overrides);
    const parts = [
      starts !== null ? `clock start anomalies ${starts}` : null,
      suspended !== null ? `suspended clocks ${suspended}` : null,
      duplicates !== null ? `duplicate clocks ${duplicates}` : null,
      overrides !== null ? `manual overrides ${overrides}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0
      ? `Clock event integrity signals: ${parts.join(", ")}.`
      : "Clock Starts/Stops findings were derived from anomaly tiles and rows.";
  }
  if (params.page_type === "data_quality") {
    if (params.finding_type === "no_data") return "Validation & Data Quality returned no issues for the current filter.";
    const validationOverdue = toNum(d.validation_overdue);
    const neverValidated = toNum(d.never_validated);
    const noOwner = toNum(d.no_owner_assigned);
    const ghost = toNum(d.ghost_pathways);
    const parts = [
      validationOverdue !== null ? `validation overdue ${validationOverdue}` : null,
      neverValidated !== null ? `never validated ${neverValidated}` : null,
      noOwner !== null ? `no owner assigned ${noOwner}` : null,
      ghost !== null ? `ghost pathways ${ghost}` : null,
    ].filter(Boolean) as string[];
    return parts.length > 0
      ? `Data quality governance signals: ${parts.join(", ")}.`
      : "Validation and data quality findings were derived from issue tiles and rows.";
  }
  if (params.finding_type === "no_rows") return "RTT Monitoring returned no rows for the current filter.";
  if (params.finding_type.includes("breach")) {
    const specialty = toText(d.specialty, "Unknown specialty");
    const breaches = toNum(d.breaches_52w);
    return breaches !== null
      ? `${specialty} has the highest 52-week breach count at ${breaches}.`
      : "52-week breach status was derived from RTT specialty rows.";
  }
  const compliance = toNum(d.percent_within_18w);
  return compliance !== null
    ? `Overall compliance within target is ${compliance}%.`
    : "Compliance was derived from RTT specialty rows.";
};

const conciseBulletsFor = (params: ExplanationParams): string[] => {
  const d = params.finding_data;
  if (params.page_type === "ptl") {
    return [
      "PTL is a patient-level tracking list.",
      params.finding_type === "longest_waiter"
        ? "Waiting days are measured per patient row."
        : "Counts reflect visible PTL rows only.",
    ];
  }
  if (params.page_type === "waiting_list") {
    return [
      "Waiting List Management is aggregated by specialty.",
      params.finding_type === "capacity_gap"
        ? "Capacity gap compares demand against available scheduled capacity."
        : "Average wait represents the mean wait across specialty rows.",
    ];
  }
  if (params.page_type === "cancer_2ww") {
    return [
      "Cancer Pathways (2WW) is an urgent referral compliance dashboard.",
      "62-day compliance indicates target performance along urgent cancer pathways.",
      "Urgent diagnostics pending indicates unresolved diagnostic bottlenecks.",
      "Safety escalations are explicit risk flags from the displayed payload.",
    ];
  }
  if (params.page_type === "referrals") {
    return [
      "Referral Management tracks intake and triage workflow state.",
      "Triage stage indicates whether referrals are still awaiting clinical prioritization.",
      "Overdue triage flags delays in intake handling.",
      "Conversion rate is the page metric for referral progression as displayed.",
    ];
  }
  if (params.page_type === "triage") {
    return [
      "Triage Status is a case-level decision queue for triage workflow.",
      "Awaiting consultant review represents items still pending clinical review.",
      "Overdue triage flags triage items that exceeded the queue SLA.",
      "Clarification requested and reprioritization pending show active follow-up queue states.",
    ];
  }
  if (params.page_type === "breach_tracking") {
    return [
      "Breach Tracking is a case-level compliance and accountability dashboard.",
      "Each breach row represents a case that exceeded target timing.",
      "Repeat breach count reflects repeated breach cases shown on the page.",
      "Ownership highlights accountability for active breach follow-up.",
    ];
  }
  if (params.page_type === "pathway_milestones") {
    return [
      "Pathway Milestones is a stage-level flow dashboard.",
      "Average wait shows time spent in each pathway stage.",
      "Bottleneck stage is the stage with highest average wait in the current rows.",
    ];
  }
  if (params.page_type === "clock_events") {
    return [
      "Clock Starts/Stops is an RTT clock event integrity and audit dashboard.",
      "Anomalies represent issues in clock timeline event quality.",
      "Manual overrides indicate audited manual interventions in clock records.",
    ];
  }
  if (params.page_type === "data_quality") {
    return [
      "Validation & Data Quality is a governance and data integrity dashboard.",
      "Validation counts indicate records requiring quality review.",
      "Owner assignment indicates accountability for issue remediation tracking.",
    ];
  }
  return [
    "RTT Monitoring is a compliance dashboard.",
    "Within-target compliance and long-wait breaches are read from RTT tiles and specialty rows.",
    typeof d.forecast_breaches === "number" ? `Forecast breaches tile: ${d.forecast_breaches}.` : "Forecast breaches are shown only when that tile is present.",
  ];
};

const expandedBulletsFor = (params: ExplanationParams): string[] => {
  const d = params.finding_data;
  if (params.page_type === "ptl") {
    const waiting = toNum(d.waiting_days);
    const targetWeeks = toNum(d.rtt_target_weeks);
    const targetDays = targetWeeks !== null ? targetWeeks * 7 : null;
    return [
      "PTL is a micro view where each row is a patient pathway.",
      waiting !== null ? `Observed wait from row data: ${waiting} days.` : "Observed waits come directly from PTL row values.",
      waiting !== null && targetDays !== null
        ? waiting > targetDays
          ? `The observed wait is above the RTT target window for that row.`
          : "The observed wait is within the RTT target window for that row."
        : "RTT target comparison is only made when both wait and target values are present.",
    ];
  }
  if (params.page_type === "waiting_list") {
    const avg = toNum(d.avg_wait_days);
    const gap = toNum(d.capacity_gap);
    return [
      "Waiting List Management is a macro dashboard grouped by specialty.",
      avg !== null ? `Observed specialty average wait: ${avg} days.` : "Average wait is read from specialty aggregate values.",
      gap !== null
        ? `Observed capacity gap value: ${gap}.`
        : "Capacity gap indicates unmet capacity when demand exceeds planned slots.",
      "This view supports specialty-level pressure assessment rather than patient-level tracing.",
    ];
  }
  if (params.page_type === "cancer_2ww") {
    return [
      "2WW represents urgent cancer referral pathways requiring rapid progression through diagnosis and treatment steps.",
      "62-day compliance reflects whether pathways are completing against the target timeframe shown in this dashboard.",
      "Urgent diagnostics pending highlights waiting diagnostic work that can delay treatment readiness.",
      "Safety escalations are recorded risk flags requiring immediate operational attention.",
    ];
  }
  if (params.page_type === "referrals") {
    return [
      "Referral Management is an intake and triage workflow dashboard.",
      "Triage stage means referrals are queued for clinical review and prioritization.",
      "Overdue triage matters operationally because intake delays can push downstream pathway timing.",
      "Conversion rate is the progression metric shown on the page payload.",
    ];
  }
  if (params.page_type === "triage") {
    return [
      "Triage Status is a decision queue showing where triage work is still pending.",
      "Awaiting consultant review means the item has not completed consultant triage review.",
      "Overdue triage indicates queue age beyond the triage SLA threshold used in this page.",
      "Clarification requested means additional detail is required before triage can complete.",
      "Reprioritization pending indicates at-risk cases needing queue priority updates.",
    ];
  }
  if (params.page_type === "breach_tracking") {
    return [
      "Breach Tracking shows breached cases at row level for direct accountability.",
      "A breach means the pathway exceeded the RTT target for that case.",
      "Repeat breaches indicate cases with recurrent breach pattern in the displayed metric.",
      "Ownership tracking matters because unassigned breaches have no clear case owner.",
      "Weekly trend represents the page's breach trend tile when available.",
    ];
  }
  if (params.page_type === "pathway_milestones") {
    return [
      "Stage distribution means how many pathways are currently in each stage.",
      "Average wait between stages reflects flow delay at each stage.",
      "A bottleneck is the stage with the highest observed average wait in this payload.",
      "This differs from breach tracking: milestones describe flow; breach tracking lists exceeded-target cases.",
    ];
  }
  if (params.page_type === "clock_events") {
    return [
      "Clock start and stop events define the RTT timeline boundaries for each pathway.",
      "Anomalies matter because clock integrity affects RTT and breach reliability.",
      "Manual overrides imply a documented audit trail where clock data was adjusted.",
      "This view is focused on event integrity, not clinical pathway performance.",
    ];
  }
  if (params.page_type === "data_quality") {
    return [
      "Validation means checking pathway records for required completeness and consistency.",
      "Duplicate identifiers matter because they can distort pathway tracking and reporting.",
      "Owner assignment matters because unresolved issues need accountable ownership.",
      "Ghost pathways indicate stale pathways with prolonged inactivity signals in the payload.",
    ];
  }
  const compliance = toNum(d.percent_within_18w);
  const breaches = toNum(d.breaches_52w);
  return [
    "RTT Monitoring is a regulatory compliance dashboard.",
    compliance !== null
      ? `Observed compliance from RTT data: ${compliance}%.`
      : "Compliance is read from RTT tiles or specialty rows.",
    breaches !== null
      ? `Observed long-wait breach count from specialty rows: ${breaches}.`
      : "Long-wait breach severity is read from specialty breach counts.",
    typeof d.forecast_breaches === "number"
      ? `Forecast breaches tile is present in this payload.`
      : "Forecast breaches are referenced only when that tile exists.",
  ];
};
