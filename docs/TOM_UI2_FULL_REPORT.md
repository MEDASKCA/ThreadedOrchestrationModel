# TOM UI2 — Comprehensive App Report

Generated: 2026-02-22
Location: C:/Users/forda/medaskca-tom/tom-ui2

## 0) Scope And Limits
This report covers all pages, sections, APIs, data flows, orchestration logic, and UI patterns in this repo. It does not reproduce every single literal UI string because several components contain large blocks of mock data (hundreds of lines of rows). Instead, it lists where that text lives and how it is used. If you need a literal text dump, I can generate it by extracting each component into a structured text file.

## 1) High-Level Architecture
- Framework: Next.js (App Router).
- UI shell: a single AppShell that hosts all sections (chat + operations + logistics + planning + collaboration + intelligence + settings).
- Data model: connectors registry (sandbox by default) + Firebase for certain modules + Prisma for TOM audit/action logging.
- Orchestration: Truth Firewall + tool registry + verifier + action engine.
- Primary interaction pattern: user chat prompt goes through TOM, which may open/route to specific operational views with filters.

## 2) Routes (Pages)
### 2.1 App Routes
- `/` ? `app/page.tsx` ? `AppShell`.
- `/collaboration/forum` ? `app/collaboration/forum/page.tsx` ? `AppShell`.
- `/collaboration/forum/*` ? `app/collaboration/forum/[...slug]/page.tsx` ? `AppShell`.

There are no other distinct page-level routes; everything else is a section within `AppShell`.

## 3) UI Shell And Navigation
### 3.1 AppShell
File: `components/AppShell.tsx`

Responsibilities:
- App-wide state: active section, chat messages, history, settings tab, mobile sidebar.
- Deep links via query params:
  - `/?section=operations&view=ptl&specialty=...` etc.
- Calls TOM: `POST /api/tom/chat`.
- Section switching between:
  - Chat
  - Operations
  - Logistics
  - Planning
  - Collaboration
  - Intelligence
  - Settings/Configurator

### 3.2 Sidebar
File: `components/Sidebar.tsx`

Sidebar includes:
- New thread button
- Search (command palette)
- Section navigation
- Recent activity mock list
- User profile

### 3.3 Command Palette
File: `components/CommandPalette.tsx`

Used for:
- Chat history restore
- Quick navigation

## 4) Chat + TOM Assistant
### 4.1 Chat UI
File: `components/ChatPanel.tsx`

Features:
- Text input and voice mode
- Message list with rich rendering
- Voice TTS playback
- Voice input via Web Speech API
- Sends to `/api/tom/chat`

### 4.2 Rich Response Rendering
File: `components/RichResponseRenderer.tsx`

Renders:
- Title + summary
- Sections
- Tables
- Context cards
- Next actions (dispatching `tom:action` events)
- Evidence panel (suppressed when no data_used)

## 5) Core TOM Orchestration
### 5.1 Truth Firewall
File: `lib/tom/truth-firewall.ts`

- Classifies intent
- Calls tools
- Builds evidence
- Determines missing sources
- Computes confidence and signal strength
- Generates permitted actions

### 5.2 Intent + Reasoning
Files:
- `lib/tom/reasoning/intent.ts`
- `lib/tom/reasoning/engine.ts`

Current intents:
- `smalltalk`
- `operational_query`
- `governance_query`
- `architecture_query`
- `unsupported_domain`
- `staffing`

### 5.3 Tool Registry
File: `lib/tom/tools/registry.ts`

Tools:
- `epr.ptl_summary`
- `alerts.active`
- `anomalies.open`
- `pas.referrals_summary`
- `comms.summary`
- `roster.staffing_summary`

### 5.4 Action Engine
File: `lib/tom/actions.ts`

Actions supported:
- `open` (deep links to views)
- `filter` (deep links with filters)
- `connect` (logs connection request)

### 5.5 Verifier
File: `lib/tom/verifier.ts`

Blocks responses that include numbers/names not supported by evidence.

### 5.6 TOM Chat API
File: `app/api/tom/chat/route.ts`

Flow:
- parse prompt
- initialize connectors
- run Truth Firewall
- generate deterministic response
- optional LLM response (structured JSON)
- verify
- store context + audit
- return rich response

Smalltalk now returns:
- Greeting only (no actions, no evidence, no data used)
- Capability query returns a short capability response

## 6) Operations Section (Access & Pathways)
File: `components/sections/OperationsSection.tsx`

Contains:
- Left nav grouped by Access/Capacity/Activity/Procedures/Flow
- Views that are either:
  - data-driven via AccessPathwaysMetricsView
  - mock dashboards (Session Planner, Solari)

### 6.1 AccessPathwaysMetricsView
- Fetches metrics + table from endpoints like:
  - `/api/access-pathways/waiting-list`
  - `/api/access-pathways/rtt-monitoring`
  - `/api/access-pathways/cancer-pathways`
  - `/api/access-pathways/referral-management`
  - `/api/access-pathways/triage-status`
  - `/api/access-pathways/breach-tracking`
  - `/api/access-pathways/pathway-milestones`
  - `/api/access-pathways/clock-starts-stops`
  - `/api/access-pathways/validation-quality`

### 6.2 PTL View
- Uses pathways data + filters
- The mock list lives at the top of `OperationsSection.tsx` and `lib/pathways/fixtures.ts`

### 6.3 Session Planner / Solari
- Purely mock UI; readiness for later wiring

## 7) Logistics Section (Spreadsheet Views)
File: `components/sections/LogisticsSection.tsx`

- Spreadsheet-like tables
- In-memory mock data in `VIEWS`
- Live overrides from:
  - `/api/roster/shifts`
  - `/api/inventory/stock`

## 8) Planning Section
File: `components/sections/PlanningSection.tsx`

- Reads Firestore collections:
  - `rosterShifts`
  - `sessions`

## 9) Collaboration Section
File: `components/sections/CollaborationSection.tsx`

- Forum thread list, thread detail, deliverables
- All data is local (no APIs): `lib/collaboration.ts`

## 10) Intelligence Section
File: `components/sections/IntelligenceSection.tsx`

- Firestore data:
  - `messengerAuditLog`
  - `theatreLists`
- TOM audit logs:
  - `/api/tom/audit`

## 11) Settings / Integrations
### 11.1 Settings
File: `components/sections/SettingsSection.tsx`

- `Hospitals` tab reads Firestore `hospitals`
- Integrations tab renders `ConnectorsSection`

### 11.2 Integrations Marketplace
File: `components/sections/ConnectorsSection.tsx`

- Visual marketplace of categories and platforms
- Driven by `lib/connectors.ts` definitions

## 12) APIs (Full Endpoint List)
### TOM
- `POST /api/tom/chat`
- `GET /api/tom/audit`
- `GET /api/tom/alerts`
- `GET /api/tom/anomalies`
- `GET /api/tom/anomalies/history`
- `POST /api/tom/anomalies/run`
- `POST /api/tom/baselines/run`
- `POST /api/tom/metrics/run`

### Access & Pathways
- `GET /api/access-pathways/ptl`
- `GET /api/access-pathways/ptl/metrics`
- `GET /api/access-pathways/waiting-list`
- `GET /api/access-pathways/rtt-monitoring`
- `GET /api/access-pathways/cancer-pathways`
- `GET /api/access-pathways/referral-management`
- `GET /api/access-pathways/triage-status`
- `GET /api/access-pathways/breach-tracking`
- `GET /api/access-pathways/pathway-milestones`
- `GET /api/access-pathways/clock-starts-stops`
- `GET /api/access-pathways/validation-quality`
- `GET /api/access-pathways/metadata`

### Direct Connectors
- `GET /api/epr/pathways`
- `GET /api/roster/shifts`
- `GET /api/inventory/stock`
- `GET /api/opcs/search`

### Integrations
- `POST /api/integrations/switch`
- `GET /api/integrations/status`

### Voice
- `POST /api/openai-tts`

## 13) Data Sources And Connectors
### 13.1 Connector Registry
File: `lib/integrations/registry.ts`

Connector categories:
- EPR
- Roster
- Inventory
- OPCS

Defaults: all sandbox. Switchable via `/api/integrations/switch`.

### 13.2 Sandbox Fixtures
- EPR fixture: `lib/pathways/fixtures.ts`
- EPR sandbox: `lib/integrations/epr/sandbox.ts`
- Roster sandbox: `lib/integrations/roster/sandbox.ts`
- Inventory sandbox: `lib/integrations/inventory/sandbox.ts`
- OPCS sandbox: `lib/integrations/opcs/sandbox.ts`

## 14) Visual System + UI Patterns
### 14.1 Visual Language
- Clean, light UI
- Wide data tables with sticky headers
- Strong use of status colors
- Cards and chips for status/metrics

### 14.2 Tables
- Spreadsheet tables for logistics and operations
- Metrics cards at top of Access Pathways

### 14.3 Voice UI
- Distinct voice EQ animation
- Different from GPT/Claude visual styles

## 15) Key Text Sources (Where Copy Lives)
- AppShell top bar and navigation text: `components/AppShell.tsx` + `components/Sidebar.tsx`
- Chat greeting and responses: `app/api/tom/chat/route.ts` + `lib/tom/narrative.ts`
- Operations labels and categories: `components/sections/OperationsSection.tsx`
- Logistics view labels + mock data: `components/sections/LogisticsSection.tsx`
- Collaboration copy and UI text: `components/sections/CollaborationSection.tsx`
- Integrations marketplace copy: `components/sections/ConnectorsSection.tsx`
- Docs: `docs/*`

## 16) TOM Orchestration Patterns To Use In Your 30-Day Plan
### 16.1 What Works Now
- Truth Firewall is already gating responses
- Tool registry exists for operational data
- Deep links can jump to specific views with filters

### 16.2 What Is Missing For “Full TOM”
- Expand tool coverage to match Operations metrics endpoints
- Move Planning/Intelligence/Settings off Firestore into connector-based sources
- Use the same data surfaces for UI + TOM chat

### 16.3 Suggested 30-Day Build Sequence
- Week 1: Complete tool coverage + unify data paths
- Week 2: Map external connectors (real data)
- Week 3: Expand reasoning (priority/risk scoring)
- Week 4: Harden audit, provenance, and governance

## 17) Documentation Files (Existing)
- `docs/tom-central-interface.md`
- `docs/tom-integrations.md`
- `docs/tom-governance.md`
- `docs/tom-anomalies.md`
- `docs/integrations.md`
- `docs/integrations-env.md`
- `docs/integrations-sandboxes.md`
- `docs/connector-coverage.md`
- `docs/access-pathways-api.md`
- `docs/access-pathways-metrics.md`
- `docs/collaboration-plugins.md`
- `docs/Proposals.md`
- `docs/Rehydration.md`
- `docs/rehydration-report.md`

---

If you want the “every text” dump, I can generate a full string inventory from all TSX/MD/CSS files into a single file for your archive.
