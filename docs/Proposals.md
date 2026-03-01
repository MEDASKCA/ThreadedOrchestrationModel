# Proposals

## FP-001: Escalation receipts + retro visibility for managers

### Problem
Managers should not miss escalated cases during leave. If a deputy handles and closes a case, the manager still needs visibility and a “receipt” of closure.

### Proposal
- Introduce the concept of **Oversight Recipients** (role-based, e.g. Service Manager) that persists even if the active handler changes.
- When a case is **closed** (or resolved) after being escalated:
  - Send a closure notification/receipt to oversight recipients.
  - Case remains viewable in a “Closed while you were away” / “Retro review” view.

### UX notes
- Closure receipts should be low-noise (digest option).
- Retro review view should show: case title, topic, source, status transitions, closed by, timestamps, escalation history.

### Data/Events
- Persist escalation history: escalated_to changes and timestamps.
- Persist closure events with actor + reason.

### Out of scope (for now)
- No mandatory approval before closure.
- No complex delegation scheduling.

### Acceptance criteria (later)
- Manager returning after leave can view cases closed during absence.
- Manager receives closure receipts even if not the active handler.

---

## FP-002: Delegation / deputy coverage for escalation targets

### Problem
Escalation targets may be unavailable (leave/on-call rotation). Escalations must route without losing oversight.

### Proposal
- Allow escalation target to reassign to deputy while maintaining oversight recipient(s).
- Optional: delegation rules by role/team.

### Acceptance criteria (later)
- Reassignment is logged in governance log.
- Oversight recipients remain attached.

---

## FP-003: Forum interaction model – reactions limited to Like only (no Acknowledge)

### Problem
“Acknowledge” becomes noisy and is repeatedly used by the same conscientious people.

### Proposal
- Keep only Like (optional), counts visible.
- Replace “Acknowledge” with **FAO** (directed attention) and structured escalation workflow.

### Acceptance criteria (later)
- Like is a toggle.
- Like list is viewable.
- No “who viewed”; views count only.

---

## FP-004: FAO (For the attention of) field on case creation

### Problem
Need directed attention without creating social mechanics or forcing acknowledgements.

### Proposal
- Add FAO to case create/edit: target user(s) or role/team.
- Show FAO in thread header metadata.
- Send notifications to FAO targets.
- Optional future: “Awaiting response from FAO” state.

### Acceptance criteria (later)
- FAO visible in header.
- FAO notifications sent.

---

## FP-005: Forum categories (pending taxonomy)

### Problem
We need a stable category taxonomy for Forum threads to replace “By Topic” with “By Category”.

### Proposal
- Add a **Category** field for Forum threads.
- “By Category” becomes a primary navigation view.
- Topics become keyword-style tags/search rather than navigation.

### Out of scope (for now)
- Final category list and governance.

### Acceptance criteria (later)
- Categories list defined and implemented across create + list views.
## FP-006: Deliverable reference format

### Problem
Deliverables need a consistent human-readable reference format.

### Proposal
Use CATEGORY-SOURCE-DATE format, e.g. OPS-FOR-022226.

### Acceptance criteria (later)
- Deliverables show references in CATEGORY-SOURCE-DATE format.
- Source reflects the originating area (e.g. FOR for Forum, DEL for Deliverables).

