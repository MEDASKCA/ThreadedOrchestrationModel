# TOM Internal Reasoning Engine Map

## Phase 1: Spine & Trace
- Add ReasoningTrace type
- Emit trace per message in `/api/tom/chat`
- Persist trace with existing audit logging (if present) OR store alongside current TOM audit model
- Add minimal tests (even if placeholder)
- Checkpoint 0003: Persist ReasoningTrace to `rehydration/traces` and add `GET /api/tom/trace/:trace_id` (complete)

## Phase 2: Verifier & Contracts
- Define verification contracts for each intent
- Expand verifier rules to cover high-risk facts
- Bind verifier output into the trace

## Phase 3: Planner & Orchestration
- Add explicit plan builders per intent
- Orchestrate tool calls from plan steps
- Record step-level outcomes

## Phase 4: Teaching Loop & Quality
- Capture reviewer feedback
- Store counterexamples and corrections
- Track quality metrics and drift

## Upcoming
- 0004: Authority map + tool selection contracts (complete)
- 0005: Tool execution plan enforcement + authority conflict handling (complete)
- 0006: Allowed facts from evidence + verifier integration (complete)
- 0007: Used facts tracking (response cites fact ids) + section-level provenance (complete)
- 0008: Clarification responses driven by plan (clarify step becomes user-visible) + teaching workflow hooks (complete)
- 0009: Clarification UI actions + deterministic preference memory (tone/format) scoped to session (complete)
- 0010: PageContext + ViewRegistry + view.read tool (pages-first) (complete)
- 0011: Expand ViewRegistry coverage + unify page data services (no UI/tool drift) (complete)
- 0012: Deterministic View Finder (global pages-first) + avoid connector-status fallback (complete)
- 0012.3: Section overview intent (pages-based) to avoid metric/timeframe fallback (complete)
- 0012.2: Meta feedback intent + routing reorder + fallback gating (complete)
- 0013: Implement Planning/Collaboration readers for 'pending tasks' + unify remaining views (complete; pending work routing depends on planning/collaboration readers being implemented)
- 0012.1a: Routing telemetry tags in trace + debug_routing_path in response (complete)
- 0014: Deterministic voice layer (chatty + informational) (complete)
- 0015: Orchestration actions + Canvas workspace panel (complete)
- 0016: Risk gates for state-changing actions + approvals + audit trails (complete)
- 0016.1: Approval clarity + approval_help intent (complete)
- 0017: Conversation pattern shaper (chatty + informational) (complete)
- 0018: Conversational misc intent + deterministic chatty random-question responses (complete)
- 0019: Emotion and short utterance handling to prevent fallback loops (complete)
- 0019.1: Emotion flow polish + anti-fallback lock + single-question rule (complete)
- 0019.2: Presence ping + complaint routing + global text sanitiser + anti-fallback lock (complete)
- 0020: Conversational default fallback + global response sanitiser (complete)
- 0021: UI command intent for immediate canvas/panel orchestration (complete)
- 0022: Waiting-list extremes override (`longest waiter`) routed to waiting-list view.read (complete)
- 0023: Workspace-first canvas layout + snapshot routing + hardened waiting-list extremes (complete)
- 0030: OpenAI Reasoning Assist Mode (hybrid conversational layer) (complete)
- 0030-min: OpenAI conversational rewrite assist (gated) (complete)
- 0030.1: Assist debug visibility + conversational misc weather path + sanitizer dedupe fix (complete)
- 0031: LLM-first planner (advisory) + deterministic gating (complete)
- 0032: Remove reset spam + micro-intents + continuity (complete)
- 0033: Domain boundary + conversational_misc world chat mode (complete)
- 0034: Prompt budget tuning + continuity memory scoring
- 0040: General chat mode + pages-first app mode + table snapshots + canvas parity (complete)
- 0041: Snapshot drilldowns + table actions (sort/filter/pin) with deterministic guardrails
- 0033.1: Unknown domain handler for plausible unsupported topics (complete)
- 0034: Deep reasoning pipeline (Think -> Read -> Verify -> Respond) (complete)
- 0035: Section-aware answer templates + field-level missing-data clarifiers
- 0034.1: Full app page catalog in ViewRegistry for deterministic page awareness (complete)
- 0037: PTL page cognitive model + analyser-driven grounded responses (complete)
- 0038: Waiting List page cognitive model + specialty/time buckets (complete)
- 0039: RTT Monitoring cognitive model + compliance/breach analyzers (complete)
- 0040.1: Deterministic explanation layer for PTL/Waiting List/RTT findings (complete)
- 0041: Concise-by-default explanations + expand-on-request (complete)
- 0042: Cancer Pathways (2WW) cognitive model + safety/compliance analyzers (complete)
- 0043: Referral Management cognitive model + triage workflow analyzers (complete)
- 0044: Triage Status cognitive model + decision queue analyzers (complete)
- 0045: Breach Tracking cognitive model + compliance/accountability analyzers (complete)
- 0046: Pathway Milestones cognitive model + flow/bottleneck analyzers (complete)
- 0047: Clock Starts/Stops cognitive model + audit/integrity analyzers (complete)
- 0048: Validation & Data Quality cognitive model + data hygiene analyzers (complete)
- 0049: Bed Management cognitive model + capacity pressure analyzers
