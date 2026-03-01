# Rehydration

## Checkpoints
- Deliverables table: added Ref column before Task. Reference format now CATEGORY-SOURCE-DATE (example OPS-FOR-022226). Current implementation uses OPS-DEL-{dueDate} format.
- Forum left-nav IA updated to lean structure.
- Forum thread list restyled to classic forum table (anchored table, header band, zebra rows, tighter density).
- Source column added before Status with origin labels; “Forum” display renamed to “Direct”; “System” display replaced with “TOM”.
- Status column switched to plain text (no pills/badges).
- Forum pager bar updated to show thread range + pagination strip; Search/Tools converted to dropdowns.
- Forum routing now supports list variants (All Threads, By Topic, Trending, Pinned) and thread selection via /thread/:id path segment.
- Reading pane modes implemented (Split Right + Full Page); preference persisted; narrow screens force Full Page.
- Thread detail MVP interaction model added (reply, like, acknowledge, watch; mod tools: pin/lock/escalate/resolve; governance events recorded).
- UK date/time format applied to thread starter and last post metadata.

## Notes
- Any new checkpoints should be appended in chronological order.
