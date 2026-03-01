export function isWaitingListExtremesQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("longest waiter") ||
    text.includes("longest wait") ||
    text.includes("highest wait") ||
    text.includes("top waiter") ||
    text.includes("top waiters") ||
    text.includes("max wait") ||
    text.includes("who is waiting the longest")
  );
}
