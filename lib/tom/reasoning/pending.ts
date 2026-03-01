export function isPendingWorkQuery(message: string): boolean {
  const text = message.toLowerCase();
  const cues = [
    "pending task",
    "pending tasks",
    "to do",
    "todo",
    "outstanding",
    "deliverable",
    "backlog",
    "what's pending",
    "what is pending",
  ];
  return cues.some((cue) => text.includes(cue));
}
