# Connector Capability Coverage

This file defines which connector categories provide each TOM surface capability.

## Access & Pathways
- PTL / RTT / Cancer / Referral / Triage / Breach / Milestones / Clock / Validation
  - Primary sources: EPR connectors (Cerner/Epic/Nervecentre)
  - Secondary: e-RS / GP Connect (future)

## Logistics
- Workforce (Roster, Allocation, FTE, Shifts, Absence)
  - Primary sources: Roster connectors (HealthRoster/Allocate/Optima)
- Supplies & Equipment
  - Primary sources: Inventory connectors (Oracle)
- Inventory (Stock, Warehousing, Distribution, Returns)
  - Primary sources: Inventory connectors (Oracle)

## Procedures
- OPCS lookup
  - Primary sources: OPCS connector (OPCS-4 dataset)

## Governance
- Threshold alerts
  - Derived from EPR + Inventory connectors

## Sandbox / Test Access
- Reference: `docs/integrations-sandboxes.md`
