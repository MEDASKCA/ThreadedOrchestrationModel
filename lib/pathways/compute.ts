import { PATHWAY_THRESHOLDS } from "./constants";
import { Pathway } from "./schema";

const toDayCount = (dateString?: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const avg = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const percent = (part: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

const isBreaching = (p: Pathway) => p.rtt_status === "breaching";
const isAtRisk = (p: Pathway) => p.rtt_status === "at_risk";

export const computeWaitingListMetrics = (pathways: Pathway[]) => {
  const total = pathways.length;
  const waitingDays = pathways.map((p) => p.waiting_days);
  const avgWait = Math.round(avg(waitingDays));
  const scheduled = pathways.filter((p) => p.scheduled_date).length;
  const slotUtil = percent(scheduled, total);
  const dttToBookingDays = pathways
    .filter((p) => p.decision_to_treat_date && p.scheduled_date)
    .map((p) => {
      const start = new Date(p.decision_to_treat_date as string).getTime();
      const end = new Date(p.scheduled_date as string).getTime();
      return Math.round((end - start) / (1000 * 60 * 60 * 24));
    });
  const avgDttToBooking = Math.round(avg(dttToBookingDays));
  const backlog = pathways.filter((p) => !p.scheduled_date).length;
  const capacityGap = Math.max(0, backlog - scheduled);

  return {
    total_waiting: total,
    avg_wait: avgWait,
    slot_util: slotUtil,
    dtt_to_booking: avgDttToBooking,
    theatre_backlog: backlog,
    capacity_gap: capacityGap,
  };
};

export const computeRttMetrics = (pathways: Pathway[]) => {
  const total = pathways.length;
  const within18 = pathways.filter((p) => p.waiting_days <= 126).length;
  const breach52 = pathways.filter(
    (p) => p.rtt_status === "within_52_week" || p.waiting_days >= 364,
  ).length;
  const waits = pathways.map((p) => p.waiting_days);
  const avgWait = Math.round(avg(waits));
  const medianWait = Math.round(median(waits));
  const forecastBreaches = pathways.filter((p) => isAtRisk(p) || isBreaching(p)).length;

  return {
    within_18_weeks: percent(within18, total),
    breach_52: breach52,
    avg_wait: avgWait,
    median_wait: medianWait,
    trend_12w: avgWait,
    forecast_breaches: forecastBreaches,
  };
};

export const computeCancerMetrics = (pathways: Pathway[]) => {
  const total2ww = pathways.filter((p) => p.priority === "urgent").length;
  const within62 = pathways.filter((p) => p.priority === "urgent" && p.waiting_days <= 62).length;
  const breachBySite = pathways.filter((p) => p.priority === "urgent" && isBreaching(p)).length;
  const urgentDxPending = pathways.filter(
    (p) => p.priority === "urgent" && p.stage === "diagnostics",
  ).length;
  const safetyEscalations = pathways.filter(
    (p) => p.priority === "urgent" && p.breach_flag,
  ).length;

  return {
    active_2ww: total2ww,
    compliance_62d: percent(within62, total2ww),
    breaches_by_site: breachBySite,
    urgent_dx_pending: urgentDxPending,
    safety_escalations: safetyEscalations,
  };
};

export const computeReferralMetrics = (pathways: Pathway[]) => {
  const newReferrals = pathways.filter((p) => p.stage === "referral").length;
  const awaitingTriage = pathways.filter((p) => p.stage === "triage").length;
  const overdueTriage = pathways.filter(
    (p) => p.stage === "triage" && p.waiting_days > 14,
  ).length;
  const rejected = 0;
  const converted = pathways.filter((p) => ["decision", "scheduled", "completed"].includes(p.stage)).length;

  return {
    new_referrals: newReferrals,
    awaiting_triage: awaitingTriage,
    overdue_triage: overdueTriage,
    rejected,
    conversion_rate: percent(converted, pathways.length),
  };
};

export const computeTriageMetrics = (pathways: Pathway[]) => {
  const awaitingReview = pathways.filter((p) => p.stage === "triage").length;
  const overdueTriage = pathways.filter((p) => p.stage === "triage" && p.waiting_days > 14).length;
  const clarification = pathways.filter(
    (p) => p.stage === "triage" && p.validation_status === "required",
  ).length;
  const reprioritization = pathways.filter(
    (p) => p.stage === "triage" && isAtRisk(p),
  ).length;

  return {
    awaiting_review: awaitingReview,
    overdue_triage: overdueTriage,
    clarification,
    reprioritization: reprioritization,
  };
};

export const computeBreachMetrics = (pathways: Pathway[]) => {
  const breaches = pathways.filter((p) => isBreaching(p));
  const repeatBreaches = pathways.filter((p) => p.dna_count >= 2).length;

  return {
    breaches_by_specialty: breaches.length,
    breaches_by_cause: pathways.filter((p) => p.breach_flag).length,
    repeat_breaches: repeatBreaches,
    trend_weekly: breaches.length,
  };
};

export const computeMilestoneMetrics = (pathways: Pathway[]) => {
  const stageIndex = (stage: string) => {
    switch (stage) {
      case "referral":
        return 1;
      case "triage":
        return 2;
      case "diagnostics":
        return 3;
      case "decision":
        return 4;
      case "scheduled":
        return 5;
      case "completed":
        return 6;
      default:
        return 1;
    }
  };
  const stageGaps = pathways.map((p) => Math.round(p.waiting_days / stageIndex(p.stage)));
  const bottlenecks = pathways.filter(
    (p) => p.waiting_days > PATHWAY_THRESHOLDS.STAGNANT_DAYS,
  ).length;

  return {
    stage_distribution: pathways.length,
    avg_stage_gap: Math.round(avg(stageGaps)),
    bottlenecks,
  };
};

export const computeClockMetrics = (pathways: Pathway[]) => {
  const clockStartAnomalies = pathways.filter((p) => !p.decision_to_treat_date).length;
  const suspendedClocks = pathways.filter((p) => p.clock_status === "suspended").length;
  const stopWithoutProc = pathways.filter(
    (p) => p.clock_status === "stopped" && !p.procedure,
  ).length;
  const duplicateClocks = 0;
  const manualOverrides = pathways.filter((p) => p.validation_status === "overdue").length;

  return {
    clock_start_anomalies: clockStartAnomalies,
    suspended_clocks: suspendedClocks,
    stop_without_proc: stopWithoutProc,
    duplicate_clocks: duplicateClocks,
    manual_overrides: manualOverrides,
  };
};

export const computeValidationMetrics = (pathways: Pathway[]) => {
  const validationOverdue = pathways.filter((p) => p.validation_status === "overdue").length;
  const neverValidated = pathways.filter((p) => p.validation_status === "never_validated").length;
  const dnaNoRebook = pathways.filter((p) => p.dna_count > 0 && !p.scheduled_date).length;
  const noOwner = pathways.filter((p) => !p.owner_id).length;
  const duplicateNhs = 0;
  const missingFields = pathways.filter((p) => !p.procedure || !p.consultant).length;
  const noContact = pathways.filter((p) => {
    const days = toDayCount(p.last_activity_date) ?? 0;
    return days > PATHWAY_THRESHOLDS.GHOST_ACTIVITY_DAYS;
  }).length;
  const ghostPathways = pathways.filter((p) => {
    const days = toDayCount(p.last_activity_date) ?? 0;
    return days > PATHWAY_THRESHOLDS.GHOST_ACTIVITY_DAYS && p.waiting_days > PATHWAY_THRESHOLDS.GHOST_WAITING_DAYS;
  }).length;

  return {
    validation_overdue: validationOverdue,
    never_validated: neverValidated,
    dna_no_rebook: dnaNoRebook,
    no_owner: noOwner,
    duplicate_nhs: duplicateNhs,
    missing_fields: missingFields,
    no_contact: noContact,
    ghost_pathways: ghostPathways,
  };
};
