export interface ViewCandidate {
  id: string;
  score: number;
  reasons: string[];
}

export function findRelevantViews(params: {
  message: string;
  registry: { id: string; label: string; section: string; implemented: boolean; notes?: string }[];
}): ViewCandidate[] {
  const text = params.message.toLowerCase();

  const hasPending =
    text.includes("pending") ||
    text.includes("tasks") ||
    text.includes("to do") ||
    text.includes("deliverable") ||
    text.includes("backlog") ||
    text.includes("outstanding") ||
    text.includes("what's pending") ||
    text.includes("whats pending") ||
    text.includes("what is pending");
  const hasStaffing = text.includes("staff") || text.includes("rota") || text.includes("shift");
  const hasInventory = text.includes("stock") || text.includes("inventory");
  const hasAlerts = text.includes("alerts") || text.includes("anomal");
  const hasAccess =
    text.includes("ptl") ||
    text.includes("waiting list") ||
    text.includes("rtt") ||
    text.includes("wl management") ||
    text.includes("backlog") ||
    text.includes("queue");
  const hasCancer2ww =
    text.includes("2ww") ||
    text.includes("two week wait") ||
    text.includes("cancer pathways") ||
    text.includes("62 day") ||
    text.includes("62-day") ||
    text.includes("urgent cancer") ||
    text.includes("urgent diagnostics") ||
    text.includes("safety escalation");
  const hasReferrals =
    text.includes("referral") ||
    text.includes("awaiting triage") ||
    text.includes("overdue triage") ||
    text.includes("conversion rate") ||
    text.includes("new referrals");
  const hasTriage =
    text.includes("triage") ||
    text.includes("awaiting consultant review") ||
    text.includes("clarification requested") ||
    text.includes("reprioritization") ||
    text.includes("reprioritisation") ||
    text.includes("decision queue");
  const hasBreachTracking =
    text.includes("breach") ||
    text.includes("breaches") ||
    text.includes("repeat breach") ||
    text.includes("breach cause") ||
    text.includes("breach owner") ||
    text.includes("breach trend") ||
    text.includes("who is breaching");
  const hasMilestones =
    text.includes("milestones") ||
    text.includes("pathway stages") ||
    text.includes("bottleneck") ||
    text.includes("stage delay") ||
    text.includes("average days between stages") ||
    text.includes("flow") ||
    text.includes("slowing down");
  const hasClockAudit =
    text.includes("clock start") ||
    text.includes("clock stop") ||
    text.includes("suspended clock") ||
    text.includes("duplicate clock") ||
    text.includes("manual override") ||
    text.includes("audit log") ||
    text.includes("audit logs") ||
    text.includes("data integrity") ||
    text.includes("missing clock start");
  const hasDataQuality =
    text.includes("validation") ||
    text.includes("data quality") ||
    text.includes("duplicate nhs") ||
    text.includes("missing mandatory") ||
    text.includes("no owner") ||
    text.includes("ghost pathway") ||
    text.includes("dna without rebook") ||
    text.includes("data hygiene");
  const hasWaitingExtremes =
    text.includes("longest waiter") ||
    text.includes("longest wait") ||
    text.includes("highest wait") ||
    text.includes("top waiter") ||
    text.includes("top waiters") ||
    text.includes("max wait") ||
    text.includes("waiting the longest");

  // ── Capacity ──────────────────────────────────────────────────────────────
  const hasBedManagement =
    text.includes("bed management") || text.includes("available beds") ||
    text.includes("occupied beds") || text.includes("ward beds") || text.includes("bed count");
  const hasWardCapacity =
    text.includes("ward capacity") || text.includes("ward occupancy") || text.includes("ward status");
  const hasIcuCapacity =
    text.includes("icu") || text.includes("intensive care") || text.includes("hdu") ||
    text.includes("high dependency") || text.includes("critical care") ||
    text.includes("level 3") || text.includes("level 2") || text.includes("picu");
  const hasTheatreCapacity =
    text.includes("theatre capacity") || text.includes("theatre availability") ||
    text.includes("theatre slots") || text.includes("theatre booking");
  const hasClinicSlots =
    text.includes("clinic slots") || text.includes("clinic availability") ||
    text.includes("appointment slots") || text.includes("available appointments") || text.includes("slot availability");
  const hasSessionPlanner =
    text.includes("session planner") || text.includes("sessions today") || text.includes("today's sessions");
  const hasTemplateUtil =
    text.includes("template utilisation") || text.includes("template util") || text.includes("theatre template");
  const hasSurgePlanning =
    text.includes("surge planning") || text.includes("surge beds") || text.includes("surge capacity") ||
    text.includes("surge plan");
  const hasForwardCapacity =
    text.includes("forward capacity") || text.includes("7-day capacity") || text.includes("7 day capacity") ||
    text.includes("capacity forecast") || text.includes("projected demand") || text.includes("next 7 days");

  // ── Activity & Performance ────────────────────────────────────────────────
  const hasDailyVsPlan =
    text.includes("daily activity") || text.includes("activity vs plan") ||
    text.includes("procedures today") || text.includes("today's activity") || text.includes("planned vs actual");
  const hasTheatreUtil =
    text.includes("theatre utilisation") || text.includes("theatre util") ||
    text.includes("theatre performance") || text.includes("theatre overrun");
  const hasClinicUtil =
    text.includes("clinic utilisation") || text.includes("clinic util") || text.includes("clinic performance");
  const hasDnaRates =
    text.includes("dna rate") || text.includes("dna rates") || text.includes("did not attend") ||
    text.includes("missed appointment") || text.includes("dna");
  const hasCancellationRates =
    text.includes("cancellation rate") || text.includes("cancellation rates") || text.includes("cancelled appointments");
  const hasBreachPerf =
    text.includes("breach performance") || text.includes("breach rate") || text.includes("breach statistics");
  const hasTargets =
    text.includes("performance targets") || text.includes("kpi") || text.includes("key performance indicator") ||
    text.includes("against target") || text.includes("vs target");
  const hasVariance =
    text.includes("variance analysis") || text.includes("variance report") || text.includes("plan variance");
  const hasSpecialtyPerf =
    text.includes("specialty performance") || text.includes("speciality performance") || text.includes("per specialty");
  const hasSolari =
    text.includes("solari") || text.includes("live board") || text.includes("operational board") ||
    text.includes("live operational") || text.includes("real time board");

  // ── Procedures ────────────────────────────────────────────────────────────
  const hasOpcsTracking =
    text.includes("opcs") || text.includes("procedure codes") || text.includes("opcs codes");
  const hasProcedureReqs =
    text.includes("procedure requirements") || text.includes("equipment required") || text.includes("procedure prep");
  const hasPreop =
    text.includes("pre-op") || text.includes("preop") || text.includes("pre-operative") ||
    text.includes("pre op checklist") || text.includes("anaes review") || text.includes("consent check");
  const hasProcedureCoding =
    text.includes("procedure coding") || text.includes("coding status") || text.includes("coded procedures") ||
    text.includes("icd-10") || text.includes("icd10");
  const hasDurationTrends =
    text.includes("duration trends") || text.includes("procedure duration") || text.includes("overrun") ||
    text.includes("theatre time") || text.includes("case duration");
  const hasTheatreListComp =
    text.includes("theatre list composition") || text.includes("list composition") ||
    text.includes("case mix") || text.includes("major cases") || text.includes("minor cases");
  const hasBacklogByProcedure =
    text.includes("backlog by procedure") || text.includes("procedure backlog") ||
    text.includes("wait by procedure") || text.includes("procedure wait");

  // ── Flow & Escalation ─────────────────────────────────────────────────────
  const hasDelayedDischarge =
    text.includes("delayed discharge") || text.includes("discharge delay") ||
    text.includes("discharge blocker") || text.includes("delayed transfer") || text.includes("dtoc");
  const hasInternalTransfers =
    text.includes("internal transfer") || text.includes("patient transfer") ||
    text.includes("ward transfer") || text.includes("step down") || text.includes("step up");
  const hasBlockedBeds =
    text.includes("blocked bed") || text.includes("bed block") || text.includes("beds blocked");
  const hasCapacityAlerts =
    text.includes("capacity alert") || text.includes("bed pressure alert") || text.includes("capacity warning");
  const hasOpel =
    text.includes("opel") || text.includes("escalation level") || text.includes("hospital escalation") ||
    text.includes("opel 3") || text.includes("opel 4");
  const hasIncidentFlags =
    text.includes("incident flag") || text.includes("incident report") ||
    text.includes("open incidents") || text.includes("reported incident");
  const hasEmergencyPressure =
    text.includes("emergency pressure") || text.includes("a&e pressure") ||
    text.includes("ambulance handover") || text.includes("emergency indicator") || text.includes("4 hour wait");
  const hasSameDayCancel =
    text.includes("same-day cancellation") || text.includes("same day cancellation") ||
    text.includes("last minute cancellation") || text.includes("same day cancel");
  const hasRiskFeed =
    text.includes("risk feed") || text.includes("risk register") || text.includes("live risk") ||
    text.includes("active risk") || text.includes("real-time risk");

  const candidates: ViewCandidate[] = params.registry.map((view, index) => {
    let score = 0;
    const reasons: string[] = [];

    if (view.implemented) {
      score += 1;
      reasons.push("implemented");
    }

    if (hasPending && view.id === "planning.sessions") {
      score += 14;
      reasons.push("pending_tasks_match");
    }
    if (hasPending && view.id === "collaboration.deliverables") {
      score += 13;
      reasons.push("pending_tasks_match");
    }
    if (hasPending && view.id === "planning.roster_shifts") {
      score += 8;
      reasons.push("pending_tasks_match");
    }
    if (hasPending && view.id === "collaboration.forum") {
      score += 7;
      reasons.push("pending_tasks_match");
    }
    if (hasPending && (view.section === "planning" || view.section === "collaboration")) {
      score += 4;
      reasons.push("pending_tasks_section_match");
    }

    if (hasStaffing && (view.id.includes("roster") || view.id.includes("shift") || view.label.toLowerCase().includes("roster"))) {
      score += 8;
      reasons.push("staffing_match");
    }

    if (hasInventory && view.id === "logistics.inventory_stock") {
      score += 10;
      reasons.push("inventory_match");
    }

    if (hasAlerts && (view.section === "intelligence" || view.id.includes("audit") || view.id.includes("anomal") || view.id.includes("alert"))) {
      score += 7;
      reasons.push("alerts_match");
    }

    if (hasAccess && (view.section === "operations" || view.id.includes("waiting") || view.id.includes("rtt") || view.id.includes("ptl"))) {
      score += 9;
      reasons.push("access_match");
    }
    if (hasCancer2ww && (view.id === "operations.cancer_2ww" || view.id === "operations.cancer")) {
      score += 14;
      reasons.push("cancer_2ww_match");
    }
    if (hasReferrals && (view.id === "operations.referral_management" || view.id === "operations.referrals")) {
      score += 13;
      reasons.push("referrals_match");
    }
    if (hasTriage && (view.id === "operations.triage_status" || view.id === "operations.triage")) {
      score += 14;
      reasons.push("triage_match");
    }
    if (hasBreachTracking && (view.id === "operations.breach_tracking" || view.id === "operations.breach")) {
      score += 15;
      reasons.push("breach_tracking_match");
    }
    if (hasMilestones && (view.id === "operations.pathway_milestones" || view.id === "operations.milestones")) {
      score += 14;
      reasons.push("milestones_match");
    }
    if (hasClockAudit && (view.id === "operations.clock_starts_stops" || view.id === "operations.clock")) {
      score += 15;
      reasons.push("clock_audit_match");
    }
    if (hasDataQuality && (view.id === "operations.validation_data_quality" || view.id === "operations.validation")) {
      score += 15;
      reasons.push("data_quality_match");
    }
    if (
      (hasWaitingExtremes || text.includes("waiting list") || text.includes("wl management") || text.includes("backlog") || text.includes("queue")) &&
      (view.id === "operations.access_pathways_waiting_list" || view.id === "operations.waiting_list_management" || view.id === "operations.waiting")
    ) {
      score += 12;
      reasons.push("waiting_extremes_match");
    }

    // ── Capacity ────────────────────────────────────────────────────────────
    if (hasBedManagement && view.id === "operations.beds") { score += 15; reasons.push("bed_management_match"); }
    if (hasWardCapacity && view.id === "operations.wardCapacity") { score += 15; reasons.push("ward_capacity_match"); }
    if (hasIcuCapacity && view.id === "operations.icuCapacity") { score += 15; reasons.push("icu_capacity_match"); }
    if (hasTheatreCapacity && view.id === "operations.theatreCapacity") { score += 14; reasons.push("theatre_capacity_match"); }
    if (hasClinicSlots && view.id === "operations.clinicSlots") { score += 14; reasons.push("clinic_slots_match"); }
    if (hasSessionPlanner && view.id === "operations.sessionPlanner") { score += 14; reasons.push("session_planner_match"); }
    if (hasTemplateUtil && view.id === "operations.templateUtil") { score += 14; reasons.push("template_util_match"); }
    if (hasSurgePlanning && (view.id === "operations.surge" || view.id === "operations.opel")) { score += 13; reasons.push("surge_match"); }
    if (hasForwardCapacity && view.id === "operations.forwardCapacity") { score += 15; reasons.push("forward_capacity_match"); }

    // ── Activity & Performance ───────────────────────────────────────────────
    if (hasDailyVsPlan && view.id === "operations.dailyVsPlan") { score += 15; reasons.push("daily_vs_plan_match"); }
    if (hasTheatreUtil && view.id === "operations.theatreUtil") { score += 14; reasons.push("theatre_util_match"); }
    if (hasClinicUtil && view.id === "operations.clinicUtil") { score += 14; reasons.push("clinic_util_match"); }
    if (hasDnaRates && view.id === "operations.dna") { score += 15; reasons.push("dna_rates_match"); }
    if (hasCancellationRates && view.id === "operations.cancellations") { score += 15; reasons.push("cancellation_rates_match"); }
    if (hasBreachPerf && view.id === "operations.breachPerf") { score += 14; reasons.push("breach_perf_match"); }
    if (hasTargets && view.id === "operations.targets") { score += 14; reasons.push("targets_match"); }
    if (hasVariance && view.id === "operations.variance") { score += 14; reasons.push("variance_match"); }
    if (hasSpecialtyPerf && view.id === "operations.specialtyPerf") { score += 13; reasons.push("specialty_perf_match"); }
    if (hasSolari && view.id === "operations.solari") { score += 15; reasons.push("solari_match"); }

    // ── Procedures ──────────────────────────────────────────────────────────
    if (hasOpcsTracking && view.id === "operations.opcs") { score += 15; reasons.push("opcs_match"); }
    if (hasProcedureReqs && view.id === "operations.procedureReqs") { score += 14; reasons.push("procedure_reqs_match"); }
    if (hasPreop && view.id === "operations.preop") { score += 15; reasons.push("preop_match"); }
    if (hasProcedureCoding && view.id === "operations.coding") { score += 14; reasons.push("procedure_coding_match"); }
    if (hasDurationTrends && view.id === "operations.durationTrends") { score += 14; reasons.push("duration_trends_match"); }
    if (hasTheatreListComp && view.id === "operations.theatreList") { score += 14; reasons.push("theatre_list_comp_match"); }
    if (hasBacklogByProcedure && view.id === "operations.backlog") { score += 14; reasons.push("backlog_procedure_match"); }

    // ── Flow & Escalation ───────────────────────────────────────────────────
    if (hasDelayedDischarge && view.id === "operations.delayedDischarge") { score += 15; reasons.push("delayed_discharge_match"); }
    if (hasInternalTransfers && view.id === "operations.transfers") { score += 15; reasons.push("internal_transfers_match"); }
    if (hasBlockedBeds && view.id === "operations.blockedBeds") { score += 15; reasons.push("blocked_beds_match"); }
    if (hasCapacityAlerts && view.id === "operations.capacityAlerts") { score += 14; reasons.push("capacity_alerts_match"); }
    if (hasOpel && (view.id === "operations.opel" || view.id === "operations.surge")) { score += 15; reasons.push("opel_match"); }
    if (hasIncidentFlags && view.id === "operations.incidentFlags") { score += 15; reasons.push("incident_flags_match"); }
    if (hasEmergencyPressure && view.id === "operations.emergency") { score += 15; reasons.push("emergency_pressure_match"); }
    if (hasSameDayCancel && view.id === "operations.sameDayCancel") { score += 15; reasons.push("same_day_cancel_match"); }
    if (hasRiskFeed && view.id === "operations.riskFeed") { score += 15; reasons.push("risk_feed_match"); }

    if (score === 0 && view.implemented) {
      score += 0.5;
      reasons.push("implemented_baseline");
    }

    return { id: view.id, score, reasons, _order: index } as ViewCandidate & { _order: number };
  });

  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a as any)._order - (b as any)._order;
    })
    .map(({ id, score, reasons }) => ({ id, score, reasons }));
}
