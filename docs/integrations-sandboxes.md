# Integration Sandboxes & Test Endpoints

This page captures publicly available sandbox/test endpoints and onboarding notes for the highest-priority connectors.
If a vendor does not publish a sandbox, we explicitly mark it as **"Vendor access required"**.

## EPR

### Cerner Millennium (Oracle Health)

**Open (unauthenticated) sandbox**
- Base URL: `https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/`
- Notes: Read-only FHIR R4 open sandbox published by Oracle Health.

**Secure sandbox**
- Access: Register app in Oracle Health code Console; secure sandbox URL is provided after registration.
- Notes: Secure sandbox uses SMART-on-FHIR auth and scoped access (requires CernerCare/Oracle Health developer registration).

### Epic

**FHIR sandbox**
- Base URL (R4): `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/`
- Notes: Epic’s open sandbox endpoints with test patient data are listed on open.epic.com.

### Nervecentre

**Public sandbox**
- Status: **Vendor access required (no public sandbox published).**

**Integration context (for planning)**
- Nervecentre integration roles reference HL7/FHIR, OAuth, and MESH as part of their integration stack.
- Nervecentre is certified for NHS MESH API usage (secure messaging).

## Workforce / Roster

### Allocate (HealthRoster / EOL)

**API docs**
- Allocate publishes API documentation for Worker, Event, Vacancy/Booking, and Reference Data APIs.
- Sandbox access is typically provisioned via Allocate support (no public base URL documented).

### Optima (RLDatix)

**API availability**
- RLDatix publishes Optima API integrations (Vacancy Management API, Bank API).
- Sandbox access is typically provided through RLDatix partner onboarding (no public base URL documented).

## Inventory

### Oracle SCM (Inventory)

**REST APIs**
- Oracle provides SCM REST endpoints for inventory resources (items, physical inventories, etc.).
- Sandbox access is tied to your Oracle Cloud tenancy (no public demo base URL documented).

## Procedures / OPCS

### OPCS-4 (NHS TRUD)

**Official dataset**
- OPCS-4 data files are published via NHS TRUD; licensing is required to download.
- Current TRUD release at time of writing: **OPCS‑4.11**, effective from **1 April 2026**.

---

## How to wire these into TOM

1. Set connector selection in `.env.local` (see `docs/integrations-env.md`).
2. Provide sandbox base URLs + tokens per connector where available.
3. If no public sandbox is available, request vendor access and add the base URL + token to `.env.local`.

TOM will **not** fabricate data: if a connector is not configured, the UI shows **"No relevant data found from connected systems"** and lists missing sources.
