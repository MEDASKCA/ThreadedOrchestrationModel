import { describe, expect, it } from "vitest";
import { pathwayFixtures } from "../lib/pathways/fixtures";
import {
  computeWaitingListMetrics,
  computeRttMetrics,
  computeCancerMetrics,
  computeReferralMetrics,
  computeTriageMetrics,
  computeBreachMetrics,
  computeMilestoneMetrics,
  computeClockMetrics,
  computeValidationMetrics,
} from "../lib/pathways/compute";

const pathways = pathwayFixtures;

describe("Access & Pathways metrics", () => {
  it("computes waiting list metrics", () => {
    const metrics = computeWaitingListMetrics(pathways);
    expect(metrics.total_waiting).toBeGreaterThan(0);
  });

  it("computes RTT metrics", () => {
    const metrics = computeRttMetrics(pathways);
    expect(metrics.within_18_weeks).toBeGreaterThanOrEqual(0);
  });

  it("computes cancer metrics", () => {
    const metrics = computeCancerMetrics(pathways);
    expect(metrics.active_2ww).toBeGreaterThanOrEqual(0);
  });

  it("computes referral metrics", () => {
    const metrics = computeReferralMetrics(pathways);
    expect(metrics.new_referrals).toBeGreaterThanOrEqual(0);
  });

  it("computes triage metrics", () => {
    const metrics = computeTriageMetrics(pathways);
    expect(metrics.awaiting_review).toBeGreaterThanOrEqual(0);
  });

  it("computes breach metrics", () => {
    const metrics = computeBreachMetrics(pathways);
    expect(metrics.breaches_by_specialty).toBeGreaterThanOrEqual(0);
  });

  it("computes milestone metrics", () => {
    const metrics = computeMilestoneMetrics(pathways);
    expect(metrics.stage_distribution).toBeGreaterThanOrEqual(0);
  });

  it("computes clock metrics", () => {
    const metrics = computeClockMetrics(pathways);
    expect(metrics.clock_start_anomalies).toBeGreaterThanOrEqual(0);
  });

  it("computes validation metrics", () => {
    const metrics = computeValidationMetrics(pathways);
    expect(metrics.validation_overdue).toBeGreaterThanOrEqual(0);
  });
});
