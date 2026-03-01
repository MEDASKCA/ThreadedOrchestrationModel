# Access & Pathways Metrics (Definitions)

This file documents the initial metric definitions used by Access & Pathways scaffolding.

## PTL metrics

- `in_pool`: No scheduled_date set
- `urgent`: priority = urgent
- `breaching`: rtt_status = breaching
- `at_risk`: rtt_status = at_risk
- `on_track`: rtt_status = on_track
- `awaiting_scheduling`: decision_to_treat_date set AND scheduled_date missing
- `awaiting_diagnostics`: stage = diagnostics
- `stagnant`: no activity > STAGNANT_DAYS
- `no_owner`: owner_id missing

## Waiting list

- `total_waiting`: Count by specialty
- `avg_wait`: Mean waiting days by specialty
- `slot_util`: Booked slots / available slots
- `dtt_to_booking`: Average days between decision-to-treat and booking
- `theatre_backlog`: Backlog count compared to planned sessions
- `capacity_gap`: Projected demand minus capacity (4-8 weeks)

## RTT monitoring

- `within_18_weeks`: Percent pathways within 18 weeks
- `breach_52`: 52-week breaches
- `avg_wait`: Mean waiting days
- `median_wait`: Median waiting days
- `trend_12w`: Weekly trend of RTT performance
- `forecast_breaches`: Projected breaches (next 8 weeks)

## Cancer pathways

- `active_2ww`: Active 2WW pathways
- `compliance_62d`: % within 62 days
- `breaches_by_site`: Breaches by tumor site
- `urgent_dx_pending`: Urgent diagnostics pending
- `safety_escalations`: Active escalations

## Referral management

- `new_referrals`: New referrals (today/weekly)
- `awaiting_triage`: Referrals not yet triaged
- `overdue_triage`: Referrals exceeding triage SLA
- `rejected`: Rejected referrals count
- `conversion_rate`: Referrals converted to treatment pathway

## Triage status

- `awaiting_review`: Awaiting consultant review
- `overdue_triage`: Triage pending > SLA
- `clarification`: Clarification requested
- `reprioritization`: Reprioritization pending

## Breach tracking

- `breaches_by_specialty`: Breaches grouped by specialty
- `breaches_by_cause`: Root cause counts
- `repeat_breaches`: Pathways with >1 breach
- `trend_weekly`: Weekly breach trend

## Pathway milestones

- `stage_distribution`: % in each pathway stage
- `avg_stage_gap`: Mean days between stages
- `bottlenecks`: Stages with highest aging

## Clock starts/stops

- `clock_start_anomalies`: Invalid or missing start events
- `suspended_clocks`: Active suspended clocks
- `stop_without_proc`: Clock stop with no procedure
- `duplicate_clocks`: Multiple clock records
- `manual_overrides`: Manual date change events

## Validation & data quality

- `validation_overdue`: Last validated beyond threshold
- `never_validated`: Validation status = never_validated
- `dna_no_rebook`: DNA recorded with no rebook
- `no_owner`: owner_id missing
- `duplicate_nhs`: Potential duplicate patient IDs
- `missing_fields`: Incomplete pathway records
- `no_contact`: No patient contact logged within threshold
- `ghost_pathways`: No activity + high waiting days

## Thresholds

Config: `lib/pathways/constants.ts`

- `DNA_WINDOW_DAYS`
- `STAGNANT_DAYS`
- `STAGNANT_DAYS_HIGH`
- `GHOST_ACTIVITY_DAYS`
- `GHOST_WAITING_DAYS`
- `VALIDATION_OVERDUE_DAYS`

## Sources metadata

Every endpoint includes `sources_used` (what was actually used) and `expected_sources` (what will be used when connected). This prevents TOM from inferring data that is not connected.
