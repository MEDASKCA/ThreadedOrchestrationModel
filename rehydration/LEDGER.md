# Rehydration Ledger

## 0001
Summary:
- Added ReasoningTrace scaffold and trace_id emission from TOM chat.
- Added rehydration docs scaffolding.

Files changed:
- rehydration/MAP.md
- rehydration/LEDGER.md
- lib/tom/reasoning/trace.ts
- app/api/tom/chat/route.ts
- tests/tom-reasoning-trace.test.ts

How to test:
- Dev server: `npm run dev`
- Curl:
  `curl -s -X POST http://localhost:3000/api/tom/chat -H "Content-Type: application/json" -d '{"prompt":"PTL summary"}'`

Expected behavior:
- Response JSON includes top-level `trace_id` for any message.
- Existing response fields remain unchanged.

## 0003
Summary:
- Persist ReasoningTrace to rehydration/traces and add GET /api/tom/trace/:trace_id.

Files changed:
- lib/tom/reasoning/trace-store.ts
- app/api/tom/chat/route.ts
- app/api/tom/trace/[trace_id]/route.ts
- tests/tom-trace-store.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Run dev server: `npm run dev`
- POST `/api/tom/chat`, note `trace_id`
- GET `/api/tom/trace/<trace_id>` and confirm it returns the saved trace JSON

## 0004
Summary:
- Added authority map and deterministic tool selection contracts.
- Wired contract-selected tool steps into ReasoningTrace planning in TOM chat.

Files changed:
- lib/tom/reasoning/authority.ts
- lib/tom/reasoning/tool-contracts.ts
- app/api/tom/chat/route.ts
- tests/tom-tool-contracts.test.ts
- tests/tom-authority.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Run dev server: `npm run dev`
- POST `/api/tom/chat` with prompt `PTL summary`
- Confirm returned trace includes a `plan.steps` tool entry with `name: \"epr.ptl_summary\"` before the respond step

## 0005
Summary:
- Add conflict detection + enforce tool contracts in execution.

Files changed:
- lib/tom/reasoning/trace.ts
- lib/tom/reasoning/conflicts.ts
- lib/tom/reasoning/intent.ts
- lib/tom/truth-firewall.ts
- app/api/tom/chat/route.ts
- tests/tom-conflicts.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Prompt: `PTL summary` => only `epr.ptl_summary` called
- Prompt: `staffing summary` => only `roster.staffing_summary` called
- Prompt: `PTL summary and staffing` => trace shows `multi_domain:explicit`
- Prompt: `PTL and what’s happening today?` => trace shows `multi_domain_ambiguous` (heuristic-dependent)
- Use `GET /api/tom/trace/<trace_id>` to inspect `conflicts`

## 0006
Summary:
- Allowed facts derived from evidence + verifier enforces evidence presence.

Files changed:
- lib/tom/reasoning/facts.ts
- app/api/tom/chat/route.ts
- lib/tom/verifier.ts
- tests/tom-facts.test.ts
- tests/tom-verifier-allowed-facts.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- POST `/api/tom/chat` with `PTL summary`
- GET `/api/tom/trace/<trace_id>`
- Confirm `trace.allowed_facts.ids` includes tool and evidence ids
- Confirm verifier reasons appear in `trace.outcome.notes` when blocked

## 0007
Summary:
- Track used_fact_ids per response/section + verifier subset enforcement.

Files changed:
- app/api/tom/chat/route.ts
- lib/tom/rich-response.ts
- lib/tom/verifier.ts
- tests/tom-used-facts.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- POST `/api/tom/chat` with `PTL summary`
- Verify response JSON includes `provenance.used_fact_ids` (non-empty)
- GET trace and confirm allowed facts count exists and used facts are a subset of `trace.allowed_facts.ids`

## 0008
Summary:
- Plan-driven clarifications + resume flow + teaching hooks.

Files changed:
- app/api/tom/chat/route.ts
- lib/tom/context.ts
- lib/tom/reasoning/trace.ts
- lib/tom/reasoning/clarification.ts
- tests/tom-clarification-resume.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Prompt: `PTL summary and staffing` => TOM asks which to prioritise
- Reply: `PTL` => TOM proceeds with PTL tool only and clears pending clarification
- GET trace shows `teaching.clarification` fields for request/resolution

## 0009
Summary:
- Clickable clarification actions + session preference memory.

Files changed:
- app/api/tom/chat/route.ts
- lib/tom/context.ts
- lib/tom/reasoning/trace.ts
- lib/tom/reasoning/preferences.ts
- tests/tom-preferences.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Send: `Use bullet points and keep it short` => preferences stored in context and trace has `verbosity:short` + `format:bullets`
- Trigger clarification and verify `next_actions` include option buttons
- Choose option via action payload `{ type:\"clarify\", kind:\"domain_priority\", choice:\"epr\" }` and ensure resume works

## 0010
Summary:
- PageContext + ViewRegistry + view.read tool (pages-first).

Files changed:
- lib/tom/context.ts
- app/api/tom/page-context/route.ts
- components/AppShell.tsx
- components/ChatPanel.tsx
- lib/tom/views/registry.ts
- lib/tom/tools/view-read.ts
- lib/tom/tools/registry.ts
- lib/tom/tools/types.ts
- lib/tom/truth-firewall.ts
- app/api/tom/chat/route.ts
- tests/tom-view-registry.test.ts
- tests/tom-page-context.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Navigate to Logistics roster view and confirm POST `/api/tom/page-context` requests are sent
- Ask TOM: `summarise this page`
- Verify TOM uses `view.read` with view_id from page context and returns a page summary

## 0011
Summary:
- Shared view readers + expanded implemented view coverage.

Files changed:
- lib/tom/views/types.ts
- lib/tom/views/registry.ts
- lib/tom/views/readers/evidence.ts
- lib/tom/views/readers/logistics.roster_shifts.ts
- lib/tom/views/readers/logistics.inventory_stock.ts
- lib/tom/views/readers/logistics.theatre_schedule.ts
- lib/tom/views/readers/operations.access_pathways_waiting_list.ts
- lib/tom/views/readers/operations.access_pathways_rtt_monitoring.ts
- lib/tom/views/readers/operations.ptl.ts
- app/api/roster/shifts/route.ts
- app/api/inventory/stock/route.ts
- app/api/access-pathways/waiting-list/route.ts
- app/api/access-pathways/rtt-monitoring/route.ts
- lib/tom/rich-response.ts
- lib/tom/truth-firewall.ts
- tests/tom-view-readers.test.ts
- tests/tom-view-registry-implemented.test.ts
- tests/tom-view-registry.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

Implemented view ids:
- logistics.roster_shifts
- logistics.inventory_stock
- logistics.theatre_schedule
- operations.ptl
- operations.access_pathways_waiting_list
- operations.access_pathways_rtt_monitoring

How to test:
- Navigate to an operations view and ask: `summarise this page`
- Navigate to a logistics view and ask the same
- Confirm trace/evidence includes `source` values starting with `view.read:<view_id>`

## 0012
Summary:
- Deterministic View Finder (global pages-first) + avoid connector-status fallback.

Files changed:
- lib/tom/views/finder.ts
- app/api/tom/chat/route.ts
- lib/tom/tools/view-read.ts
- lib/tom/truth-firewall.ts
- tests/tom-view-finder.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- In chat without a specific page context, ask: `do we have any pending task?`
  - TOM should use view finder to select planning/collaboration candidates and either read view(s) or ask which area to prioritise.
- Ask: `inventory status`
  - TOM should select and read `logistics.inventory_stock` via `view.read`.
- Inspect trace (`GET /api/tom/trace/<trace_id>`) and confirm constraints include:
  - `view_finder_used:true`
  - `view_candidates_top:<ids>`
  - `view_budget:<N>`

## 0013
Summary:
- Implement planning/collaboration readers + pending work summary.

Files changed:
- lib/tom/views/readers/planning.sessions.ts
- lib/tom/views/readers/planning.roster_shifts.ts
- lib/tom/views/readers/collaboration.deliverables.ts
- lib/tom/views/readers/collaboration.forum.ts
- lib/tom/views/pending.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- app/api/tom/chat/route.ts
- tests/tom-pending-summary.test.ts
- tests/tom-planning-collaboration-readers.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- From anywhere, ask: `do we have any pending task?`
  - TOM should read `planning.sessions` and `collaboration.deliverables` via `view.read`.
  - Response should return pending counts as bullets under `Pending work`.
- GET trace (`/api/tom/trace/<trace_id>`) and confirm evidence sources include:
  - `view.read:planning.sessions`
  - `view.read:collaboration.deliverables`

## 0012.1
Summary:
- Pending work routing override (no more timeframe/specialty).

Files changed:
- lib/tom/reasoning/pending.ts
- app/api/tom/chat/route.ts
- lib/tom/reasoning/clarification.ts
- lib/tom/views/finder.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Ask: `do we have any pending task?`
  - TOM should call `view.read` for planning/collaboration views or ask which area to prioritise.
  - TOM should not return connected-systems status fallback text for this request.
  - TOM should not ask metric/timeframe/specialty clarification for this request.

## 0012.1a
Summary:
- Routing telemetry tags in trace + debug_routing_path in response.

Files changed:
- lib/tom/reasoning/trace.ts
- app/api/tom/chat/route.ts
- rehydration/LEDGER.md

How to test:
- POST `/api/tom/chat` with `do we have any pending task?`
- Confirm response includes `debug_routing_path: "pending_override"`
- If not, inspect `trace.route.routing_path` in the response/trace endpoint

## 0014
Summary:
- Deterministic voice layer (chatty + informational).

Files changed:
- lib/tom/narrative/index.ts
- lib/tom/narrative/voice.ts
- app/api/tom/chat/route.ts
- tests/tom-voice.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Send five different prompts and confirm intros vary by `trace_id` while staying deterministic for the same `trace_id`.
- Trigger clarifications and confirm questions sound more natural while preserving intent.
- Confirm responses remain grounded with unchanged facts/evidence flow.

## 0015
Summary:
- Orchestration actions + Canvas workspace panel.

Files changed:
- lib/tom/actions.ts
- lib/tom/rich-response.ts
- app/api/tom/chat/route.ts
- components/AppShell.tsx
- components/ChatPanel.tsx
- components/CanvasPanel.tsx
- scripts/validate-golden-response.mjs
- rehydration/golden/pending_tasks.json
- rehydration/golden/ptl_breaches.json
- rehydration/golden/session_plan.json
- tests/tom-golden-fixtures.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Ask `help me plan my session` => response includes `open_canvas` action and UI opens canvas.
- Ask `show PTL tracker` => response includes `open_view` action and navigates to PTL deeplink.
- Ask `plan my week` => response includes `open_canvas` action with deterministic weekly/session template.

## 0016
Summary:
- Risk gates + approvals + audit trails.

Files changed:
- lib/tom/governance/risk.ts
- lib/tom/governance/approval.ts
- lib/tom/context.ts
- lib/tom/reasoning/trace.ts
- app/api/tom/chat/route.ts
- tests/tom-risk-policy.test.ts
- tests/tom-approval-flow.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Prompt: `save this session plan`
  - TOM should return `Confirm before I proceed` with Approve/Cancel actions.
- Approve the action
  - TOM should confirm dry-run execution and clear pending approval.
- GET trace and confirm `governance.approval` fields are populated.

## 0012.2
Summary:
- Meta feedback intent + routing reorder + fallback gating.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- app/api/tom/chat/route.ts
- components/RichResponseRenderer.tsx
- rehydration/LEDGER.md

How to test:
- Prompt: `do you know about my pages?`
  - `debug_routing_path` should be `meta_feedback` and no connected-systems banner.
- Prompt: `do we have any pending task?`
  - `debug_routing_path` should be `pending_override` or `view_finder` and no metric/timeframe clarifier.
- Prompt: `what integrations are connected?`
  - `debug_routing_path` should be `connector_fallback`.

## 0017
Summary:
- Conversation pattern shaper (chatty + informational).

Files changed:
- lib/tom/narrative/patterns.ts
- app/api/tom/chat/route.ts
- tests/tom-patterns.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Prompt: `Hi TOM`
  - Response should include a short acknowledgement prefix and feel more natural.
- Prompt: `do we have any pending task?`
  - Response should follow acknowledge -> offer, with at most one direct question when clarification is needed.
- Prompt: `PTL breaches and high waiters`
  - Response should keep facts unchanged while using deterministic conversational framing.

## 0012.3
Summary:
- Section overview intent (pages-based) to avoid metric/timeframe fallback.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- lib/tom/views/overview.ts
- app/api/tom/chat/route.ts
- tests/tom-intent-section-overview.test.ts
- tests/tom-section-overview.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `So what can you tell me about Operations?`
  - `debug_routing_path` should be `section_overview`.
  - Response should include overview bullets and `open_view`/`open_canvas` actions.
- Confirm there is no `Reviewing connected systems...` banner for this route.

## 0012.3b
Summary:
- Hard section overview guard + connected-systems banner gated to connector_fallback.

Files changed:
- app/api/tom/chat/route.ts
- components/AppShell.tsx
- components/ChatPanel.tsx
- components/RichResponseRenderer.tsx
- rehydration/LEDGER.md

How to test:
- Prompt: `Operations`
  - `debug_routing_path` should be `section_overview` with pages overview response.
- Prompt: `Can you tell me anything about operations`
  - `debug_routing_path` should be `section_overview`.
- Prompt: `PTL breaches`
  - Should follow metric path without showing `Reviewing connected systems...`.
- Prompt: `what integrations are connected`
  - `debug_routing_path` should be `connector_fallback` and banner should appear.

## 0012.4
Summary:
- Explore mode (pages-first) for generic `show me data` prompts.

Files changed:
- lib/tom/reasoning/explore.ts
- app/api/tom/chat/route.ts
- tests/tom-explore.test.ts
- rehydration/LEDGER.md

How to test:
- Prompt: `Can you show me any data that you have?`
  - `debug_routing_path` should be `explore_mode`.
  - TOM should read 1-2 views and return open-page actions plus follow-up suggestions.
- Confirm no metric/timeframe clarifier appears for this path.

## 0018
Summary:
- Conversational misc intent + deterministic chatty responses for random questions.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- lib/tom/reasoning/conversational-misc.ts
- app/api/tom/chat/route.ts
- lib/tom/narrative/voice.ts
- tests/tom-intent-conversational-misc.test.ts
- tests/tom-misc-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `how much does chatgpt know`
  - `debug_routing_path` should be `conversational_misc`.
  - Response should be conversational, tool-free, and include 2-4 next actions.
- Prompt: `what can you do`
  - Should route to `conversational_misc` and not connector fallback.
- Confirm no connected-systems banner/evidence panel appears for this route.

## 0019
Summary:
- Emotion and short utterance handling to prevent robotic fallback.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- app/api/tom/chat/route.ts
- rehydration/LEDGER.md

How to test:
- Prompt: `fuck`
  - `debug_routing_path` should be `emotion_misc`.
  - Response should be calm, with one forward-moving question and no tools.
- Confirm there is no connected systems banner and no metric/timeframe prompt for this path.

## 0016.1
Summary:
- Approval clarity + approval_help intent.

Files changed:
- lib/tom/context.ts
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- lib/tom/governance/approval-describe.ts
- app/api/tom/chat/route.ts
- tests/tom-approval-help.test.ts
- rehydration/MAP.md
- rehydration/LEDGER.md

How to test:
- Trigger an approval gate (for example: `save this session plan`).
- Ask: `what do you want me to confirm????`
  - `debug_routing_path` should be `approval_help`.
  - Response should include the pending approval `user_summary`, preview bullets, and Approve/Cancel actions.
  - No metric/timeframe clarifier should appear.
- Approve and verify dry-run execution path still completes and logs trace.

## 0019.1
Summary:
- Emotion flow polish + anti-fallback lock + single-question rule.

Files changed:
- lib/tom/context.ts
- lib/tom/narrative/dedupe.ts
- lib/tom/reasoning/emotion.ts
- app/api/tom/chat/route.ts
- components/AppShell.tsx
- tests/tom-dedupe.test.ts
- tests/tom-emotion-single-question.test.ts
- tests/tom-emotion-actions-routing.test.ts
- rehydration/LEDGER.md

How to test:
- Prompt: `any update?`
  - Should return `emotion_misc` response with no duplicated phrasing and one question.
- Prompt: `you are not making any sense`
  - Should stay in `emotion_misc` flow and avoid `No relevant data found...`.
- Click/enter `Operations`
  - Should route to Operations section overview.
- Click/enter `Show something useful`
  - Should route to `explore_mode` and read 1-2 views.

## 0019.2
Summary:
- presence_ping + complaint routing + global text sanitiser + anti-fallback lock.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- lib/tom/narrative/sanitize.ts
- app/api/tom/chat/route.ts
- tests/tom-intent-presence.test.ts
- tests/tom-intent-complaint.test.ts
- tests/tom-sanitize.test.ts
- rehydration/LEDGER.md

How to test:
- Prompt: `are you there?`
  - should route to `presence_ping`.
- Prompt: `your answer is irrelevant`
  - should route to complaint/meta feedback path and avoid metric/timeframe clarifier.
- Confirm no duplicated question lines in the response text.

## 0020
Summary:
- Conversational default fallback + global response sanitiser.

Files changed:
- lib/tom/narrative/sanitize.ts
- lib/tom/reasoning/conversational-default.ts
- app/api/tom/chat/route.ts
- tests/tom-sanitize.test.ts
- tests/tom-conversational-default.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `are you there`
  - should route to presence handling (no metric/timeframe loop).
- Prompt: `your answer is irrelevant`
  - should route to meta/emotion handling (no connector fallback).
- Prompt: `help`
  - should route to `conversational_default` with guidance actions and no metric/timeframe prompt.

## 0021
Summary:
- UI command intent for immediate canvas/panel orchestration.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/ui-command.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/truth-firewall.ts
- app/api/tom/chat/route.ts
- components/ChatPanel.tsx
- components/AppShell.tsx
- tests/tom-intent-ui-command.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `open the canvas to the right`
  - response should include `debug_routing_path: "ui_command"` and an `open_canvas` action.
  - canvas panel should open immediately.
- Prompt: `close canvas`
  - response should include a canvas-close action and the right panel should close.

## 0022
Summary:
- Explicit waiting-list extremes routing so `longest waiter` queries read the waiting-list view and avoid conversational default.

Files changed:
- lib/tom/reasoning/waiting-list.ts
- lib/tom/views/finder.ts
- lib/tom/narrative/sanitize.ts
- app/api/tom/chat/route.ts
- tests/tom-waiting-list-query.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `who is our longest waiter?`
  - should route to `ops_waiting_list_extremes`.
  - should read `operations.access_pathways_waiting_list` via `view.read`.
  - should not route to `conversational_default`.
- If wait-duration fields are unavailable in payload:
  - response should explain that and offer `open_view` for the waiting-list page.

## 0023
Summary:
- Workspace-first canvas layout (split pane + resizable + fullscreen).

Files changed:
- components/AppShell.tsx
- components/CanvasPanel.tsx
- app/api/tom/chat/route.ts
- lib/tom/reasoning/waiting-list.ts
- lib/tom/views/finder.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Trigger an `open_canvas` action.
  - Canvas should open as the primary workspace (~65% width) with chat as secondary (~35%).
- Drag the divider.
  - Chat/canvas widths should resize and persist across refresh (`tom_canvas_width_ratio`).
- Click `Fullscreen` in canvas.
  - Canvas should take full workspace width and hide the chat pane.
- Prompt: `who is our longest waiter?`
  - Should route to `ops_waiting_list_extremes` and read `operations.access_pathways_waiting_list` (no conversational default fallback).
- Prompt: `show me the snapshot of operations`
  - Should route through `explore_mode` for operations views, without metric/timeframe clarifier.

## 0030
Summary:
- OpenAI Reasoning Assist Mode (hybrid conversational layer) behind env flags.

Files changed:
- lib/tom/llm/openai.ts
- app/api/tom/chat/route.ts
- tests/tom-reasoning-assist-guard.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Set `TOM_REASONING_ASSIST=true` and `OPENAI_API_KEY` in `.env.local`.
- Prompt: `are you there?`
  - Response phrasing should become more natural on allowlisted routes.
- Prompt: `who is our longest waiter?`
  - Tool routing remains deterministic (`ops_waiting_list_extremes`) with no fact generation from OpenAI.
- Inspect trace:
  - should include `reasoning_assist:true` and `reasoning_assist_model:<model>` when assist is applied.
- Set `TOM_REASONING_ASSIST=false`:
  - deterministic output path remains unchanged.

## 0030-min
Summary:
- OpenAI conversational rewrite assist (gated) using `OPENAI_API_KEY` + `TOM_LLM_MODEL`.

Files changed:
- lib/tom/llm/reasoning-assist.ts
- app/api/tom/chat/route.ts
- tests/tom-reasoning-assist-guard.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Toggle `TOM_REASONING_ASSIST=true|false` in `.env.local`.
- Prompt: `are you there?`
  - with assist on: phrasing should be more natural on allowlisted routing paths.
  - with assist off: deterministic phrasing should remain.
- Prompt: evidence-backed query (for example: `who is our longest waiter?`)
  - response should remain deterministic; assist should not run when `used_fact_ids > 0`.

## 0030.1
Summary:
- Debug flag for assist + conversational_misc weather handling + sanitizer sentence dedupe hardening.

Files changed:
- app/api/tom/chat/route.ts
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/conversational-misc.ts
- lib/tom/narrative/sanitize.ts
- tests/tom-intent-conversational-misc.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `do you know the weather tomorrow?`
  - should route to `conversational_misc` and ask `Which location?` with city actions.
  - no connector fallback banner.
- Confirm response includes `debug_reasoning_assist: true|false`.
- Confirm trace constraints include `reasoning_assist_used:true|false`.
- Prompt that previously duplicated sentences in conversational fallback:
  - duplicate sentence/question fragments should be deduped.

## 0031
Summary:
- LLM-first planner (advisory) with deterministic gating for final routing/tools.

Files changed:
- lib/tom/llm/planner.ts
- lib/tom/reasoning/planner-gate.ts
- app/api/tom/chat/route.ts
- tests/tom-planner-gate.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Set `TOM_LLM_PLANNER=true` (and optional `TOM_LLM_PLANNER_MODEL`, `TOM_LLM_PLANNER_MAX_TOKENS`).
- Send a vague prompt:
  - response should stay conversational and include debug fields:
    - `debug_llm_planner_enabled`
    - `debug_llm_planner_used`
    - `debug_llm_planner_confidence`
    - `debug_llm_planner_intent`
- Send operational prompt:
  - deterministic routing/tools/verifier remain authoritative.
- Disable planner (`TOM_LLM_PLANNER=false`):
  - behavior falls back to prior deterministic routing.

## 0032
Summary:
- Remove reset spam with micro-intents (`greeting`, `typo_oops`, `repetition_complaint`) and continuity actions from `last_topic`.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/context.ts
- lib/tom/reasoning/continuity.ts
- app/api/tom/chat/route.ts
- tests/tom-micro-intents.test.ts
- tests/tom-reset-gating.test.ts
- tests/tom-continuity.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `oops`
  - should route to `typo_oops` with ignore/use actions (no reset template).
- Prompt: `greetings!`
  - should route to `greeting` with one question and at most two actions.
- Prompt: `why do you keep saying the same thing?`
  - should route to `repetition_complaint` (no reset template).
- After a view/section response, prompt `hello`
  - should offer `Continue: <last topic>` action.

## 0033
Summary:
- Domain boundary + conversational_misc world-chat mode for non-app questions.

Files changed:
- lib/tom/reasoning/domain.ts
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/conversational-misc.ts
- lib/tom/narrative/voice.ts
- app/api/tom/chat/route.ts
- tests/tom-domain-detect.test.ts
- tests/tom-conversational-misc.test.ts
- tests/tom-intent-conversational-misc.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `are you great with cars?`
  - should route to `conversational_misc` with a direct answer and no Operations/Planning menu.
- Prompt: `do you know BMW?`
  - should route to `conversational_misc` with a direct answer and no reset template.
- Prompt: `PTL summary`
  - should remain app-domain (`operational_query`) with normal evidence-first flow.

## 0040
Summary:
- General chat mode + pages-first app mode + table snapshots + canvas parity.

Files changed:
- lib/tom/reasoning/domain.ts
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/tools/llm-general-answer.ts
- lib/tom/tools/registry.ts
- lib/tom/tools/types.ts
- lib/tom/context.ts
- lib/tom/rich-response.ts
- app/api/tom/chat/route.ts
- components/RichResponseRenderer.tsx
- components/CanvasPanel.tsx
- components/ChatPanel.tsx
- components/AppShell.tsx
- lib/tom/views/readers/operations.ptl.ts
- lib/tom/views/readers/logistics.roster_shifts.ts
- lib/tom/views/readers/collaboration.forum.ts
- tests/tom-domain.test.ts
- tests/tom-table-section-schema.test.ts
- tests/tom-canvas-snapshot-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Prompt: `do you know BMW?`
  - routes to `conversational_misc`, answers conversationally, no ops/connector menu.
- Prompt: `PTL snapshot`
  - app-domain pages-first path returns a table section styled like grid.
- Prompt: `show it on canvas` after a snapshot
  - opens canvas with the same snapshot `blocks` table rendering.
- Prompt: `Roster snapshot` and `Threads snapshot`
  - return table-style snapshots when view payload includes rows/items.

## 0033.1
Summary:
- Add unknown_domain_query intent and dedicated unknown_domain response path for plausible but unsupported topics.

Files changed:
- lib/tom/reasoning/intent.ts
- lib/tom/reasoning/tool-contracts.ts
- lib/tom/reasoning/authority.ts
- lib/tom/reasoning/planner-gate.ts
- lib/tom/truth-firewall.ts
- app/api/tom/chat/route.ts
- tests/tom-intent-unknown-domain.test.ts

How to test:
- Prompt: `what is trending in forums?`
  - should route to `unknown_domain` and respond with a clear unsupported-domain explanation plus one clarifying question.
  - should not use reset/regroup template and should not inject operations menu.
- Prompt: `do you know the weather tomorrow?`
  - should remain `conversational_misc`.
- Prompt: emotional/profane message
  - should remain emotion handling path, not unknown-domain path.

## 0034
Summary:
- Deep reasoning pipeline: Think -> Read pages-first -> Verify -> Respond.

Files changed:
- lib/tom/reasoning/pipeline.ts
- app/api/tom/chat/route.ts
- components/ChatPanel.tsx
- components/AppShell.tsx
- tests/tom-pipeline-think.test.ts
- tests/tom-pipeline-verify.test.ts

How to test:
- Prompt: `who is our longest waiter?`
  - should route through deep reasoning, read waiting list view via `view.read`, then answer from evidence.
- Prompt: `what's trending in forums?`
  - unknown/unsupported domain should return a single clarify question without reset templates.
- Prompt: `how many are waiting?`
  - if payload lacks count/fields, response should state missing fields and offer `open_view`.

## 0034.1
Summary:
- Expand ViewRegistry to include full app page catalog (Operations, Logistics, Planning, Collaboration, Intelligence, Settings) so TOM can deterministically reference all pages.

Files changed:
- lib/tom/views/registry.ts
- tests/tom-view-registry-pages-coverage.test.ts

How to test:
- Run section overview prompts (e.g., `tell me about operations`, `show logistics`).
- Confirm bullets/actions can reference catalogued pages beyond currently implemented readers.
- Run registry coverage test to confirm key page IDs exist across all sections.

## 0037
Summary:
- PTL cognitive foundation: page model + deterministic analyser + route wiring to answer from PTL rows.

Files changed:
- lib/tom/pages/ptl.ts
- lib/tom/pages/ptl-analyser.ts
- app/api/tom/chat/route.ts
- tests/tom-ptl-analyser.test.ts
- tests/tom-ptl-routing.test.ts

How to test:
- Prompt: `How many are waiting?`
  - when `view.read:operations.ptl` is available, answer using PTL row counts (no generic fallback).
- Prompt: `Who is longest waiter?`
  - answer from PTL analyser using max `waiting_days` row.
- Prompt: `Any breaches?`
  - answer using PTL breach rows and urgent breach count.
- If PTL rows are empty:
  - response should be exactly: `The PTL page returned no rows.`
- Inspect trace constraints:
  - includes `ptl_rows:<n>` and `ptl_analyser_used:true`.

## 0038
Summary:
- Waiting List Management page understanding (macro aggregated) + analyzers.

Files changed:
- lib/tom/pages/waiting-list.ts
- lib/tom/pages/waiting-list-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- app/api/tom/chat/route.ts
- tests/tom-waiting-list-analyser.test.ts
- tests/tom-waiting-list-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `how many are waiting?`
  - returns total from waiting-list tile or row sum.
- Ask: `which specialty has longest wait?`
  - returns specialty with maximum average wait from waiting-list rows (or asks one specialty scope question when filters are not set).
- Ask: `where is capacity gap biggest?`
  - returns specialties with positive capacity gap.
- Confirm used facts/provenance:
  - response `provenance.used_fact_ids` should be a subset of trace allowed facts for `view.read:operations.access_pathways_waiting_list`.

## 0039
Summary:
- RTT Monitoring page understanding (18-week compliance and 52-week breaches) + deterministic analyzers.

Files changed:
- lib/tom/pages/rtt.ts
- lib/tom/pages/rtt-analyser.ts
- app/api/tom/chat/route.ts
- tests/tom-rtt-analyser.test.ts
- tests/tom-rtt-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `Are we compliant?`
  - returns RTT 18-week compliance from tile (or row-derived average fallback).
- Ask: `Where are breaches?`
  - returns specialty with highest 52-week breaches from RTT rows.
- Ask: `Are we breaching 18 weeks?`
  - routes to RTT analyser path (no generic metric/timeframe fallback).
- If RTT rows are empty:
  - response should be: `RTT Monitoring returned no rows for the current filter.`
- Inspect trace constraints:
  - includes `rtt_rows:<n>`, `rtt_tiles:<n>`, and `rtt_analyser_used:true`.

## 0040.1
Summary:
- Deterministic explanation layer for PTL, Waiting List, and RTT findings.

Files changed:
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-explainer.test.ts

How to test:
- PTL question (e.g. `Who is longest waiter?`) should include structured sections:
  - Context
  - What I checked
  - What it means
- Waiting list question (e.g. `where is capacity gap biggest?`) should explain aggregated-by-specialty meaning.
- RTT question (e.g. `Are we compliant?`) should explain 18-week compliance and 52-week context.
- Confirm numbers in summary/sections are unchanged from analyser outputs and provenance remains attached.

## 0041
Summary:
- Concise-by-default explanations with expand-on-request (`why` / `explain`) using stored last answer context.

Files changed:
- lib/tom/reasoning/explain-trigger.ts
- lib/tom/context.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-explain-trigger.test.ts
- tests/tom-explainer.test.ts

How to test:
- Ask: `who is our longest waiter?`
  - returns concise mode with a `Checked:` line.
- Ask: `why?`
  - returns expanded explanation from `last_answer_context` without rerunning tools.
- Ask: `refresh`
  - continues normal routing and can rerun tools.

## 0042
Summary:
- Cancer Pathways (2WW) page understanding + analyzers + concise/expanded narrative.

Files changed:
- lib/tom/pages/cancer-2ww.ts
- lib/tom/pages/cancer-2ww-analyser.ts
- lib/tom/views/readers/operations.cancer_2ww.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/reasoning/domain.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-cancer-2ww-analyser.test.ts
- tests/tom-cancer-2ww-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `how many 2ww referrals are active?`
  - routes pages-first to `operations.cancer_2ww` and returns concise key signal + `Checked:` line.
- Ask: `any safety escalations?`
  - returns safety escalation value from tile when present.
- Ask: `why does 62-day compliance matter?`
  - expanded narrative from `last_answer_context` without re-running tools unless prompt includes `refresh`/`latest`.
- Confirm trace and provenance:
  - `trace.constraints` contains `cancer_2ww_rows:<n>`, `cancer_2ww_tiles:<n>`, `cancer_2ww_analyser_used:true`.

## 0043
Summary:
- Referral Management page understanding (triage workflow) + analyzers + narrative.

Files changed:
- lib/tom/views/readers/operations.referral_management.ts
- lib/tom/pages/referrals.ts
- lib/tom/pages/referrals-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/reasoning/domain.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-referrals-analyser.test.ts
- tests/tom-referrals-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `any overdue triage?`
  - returns overdue triage from Referral Management tiles when present.
- Ask: `what's new in referrals?`
  - returns new referrals tile when present.
- Ask: `who's waiting longest for triage?`
  - returns longest wait from referral rows.
- Ask: `explain triage`
  - expanded explanation from stored last answer context (unless prompt asks `refresh`/`latest`).

## 0044
Summary:
- Triage Status page understanding (decision queue) + analyzers + concise/expanded narrative.

Files changed:
- lib/tom/views/readers/operations.triage_status.ts
- lib/tom/pages/triage.ts
- lib/tom/pages/triage-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-triage-analyser.test.ts
- tests/tom-triage-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `how many are overdue triage?`
  - returns overdue triage from Triage Status tiles when present.
- Ask: `who is waiting longest for triage?`
  - returns max waiting_days from triage rows.
- Ask: `explain clarification requested`
  - expanded explanation from stored last answer context (unless prompt asks `refresh`/`latest`).
- Confirm trace and provenance:
  - `trace.constraints` contains `triage_rows:<n>`, `triage_tiles:<n>`, `triage_analyser_used:true`
  - `used_fact_ids` are sourced from `view.read:operations.triage_status`.

## 0045
Summary:
- Breach Tracking page understanding (compliance + accountability) + analyzers + narrative.

Files changed:
- lib/tom/views/readers/operations.breach_tracking.ts
- lib/tom/pages/breach-tracking.ts
- lib/tom/pages/breach-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-breach-analyser.test.ts
- tests/tom-breach-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `how many breaches?`
  - returns breach count from Breach Tracking rows.
- Ask: `who is breaching the longest?`
  - returns max waiting-days breach case from breach rows.
- Ask: `any repeat breaches?`
  - returns repeat breach value from tile when present.
- Ask: `why are we breaching?`
  - returns listed breach causes only from the page payload, with no speculation.
- Confirm trace and provenance:
  - `trace.constraints` contains `breach_rows:<n>`, `breach_tiles:<n>`, `breach_analyser_used:true`
  - `used_fact_ids` are sourced from `view.read:operations.breach_tracking`.

## 0046
Summary:
- Pathway Milestones page understanding (flow + bottleneck analysis).

Files changed:
- lib/tom/views/readers/operations.pathway_milestones.ts
- lib/tom/pages/pathway-milestones.ts
- lib/tom/pages/pathway-milestones-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/reasoning/domain.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-milestones-analyser.test.ts
- tests/tom-milestones-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `where are we slowing down?`
  - returns bottleneck stage from Pathway Milestones rows.
- Ask: `which stage has longest wait?`
  - returns stage with max average wait.
- Ask: `explain bottleneck`
  - uses expanded explanation mode from stored answer context (unless prompt asks `refresh`/`latest`).

## 0047
Summary:
- Clock Starts/Stops page understanding (audit/integrity) + analyzers + narrative.

Files changed:
- lib/tom/views/readers/operations.clock_starts_stops.ts
- lib/tom/pages/clock-events.ts
- lib/tom/pages/clock-events-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/reasoning/domain.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-clock-events-analyser.test.ts
- tests/tom-clock-events-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `any clock start anomalies?`
- Ask: `any manual overrides?`
- Ask: `who has missing clock start?`
- Ask: `explain what this page is`
  - expanded explanation from stored answer context (unless prompt asks `refresh`/`latest`).

## 0048
Summary:
- Validation & Data Quality page understanding (governance + integrity).

Files changed:
- lib/tom/views/readers/operations.validation_data_quality.ts
- lib/tom/pages/data-quality.ts
- lib/tom/pages/data-quality-analyser.ts
- lib/tom/views/registry.ts
- lib/tom/views/finder.ts
- lib/tom/views/overview.ts
- lib/tom/reasoning/domain.ts
- lib/tom/narrative/explainer.ts
- app/api/tom/chat/route.ts
- tests/tom-data-quality-analyser.test.ts
- tests/tom-data-quality-routing.test.ts
- rehydration/LEDGER.md
- rehydration/MAP.md

How to test:
- Ask: `any validation overdue?`
- Ask: `who has no owner?`
- Ask: `explain what ghost pathways are`
  - expanded explanation from stored answer context (unless prompt asks `refresh`/`latest`).
