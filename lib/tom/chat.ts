export async function sendTomPrompt(prompt: string) {
  const res = await fetch("/api/tom/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Failed to contact TOM");
  return res.json();
}
