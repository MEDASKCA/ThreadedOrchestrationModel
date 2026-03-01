import type { RichResponse } from "@/lib/tom/rich-response";

export function buildConversationalMiscResponse(prompt: string): RichResponse {
  const text = prompt.trim().toLowerCase();
  const asksAboutCars = /\b(car|cars|bmw)\b/.test(text);
  const asksAboutTom = text.includes("what can you do") || text.includes("how can you help") || text.includes("how do you work");
  const asksAboutAi = text.includes("chatgpt") || /\b(ai|llm)\b/.test(text);
  const asksWeather = /\bweather\b/.test(text) || (text.includes("tomorrow") && !text.includes("rtt"));

  if (asksWeather) {
    const summary = "I can help with that. To give a useful weather answer, which location should I use?";
    return {
      title: "Weather check",
      summary,
      voice_summary: summary,
      sections: [],
      tables: [],
      next_actions: [
        { label: "London", rationale: "Use London.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "London" } },
        { label: "Manchester", rationale: "Use Manchester.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "Manchester" } },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "medium", rationale: "Deterministic clarification for general weather query." },
      signal_strength: { level: "low", score: 5, rationale: "No connectors used." },
    };
  }

  const summary = asksAboutCars
    ? "Yes. I can help with BMW models, maintenance patterns, buying checks, and troubleshooting basics. Which part do you want to focus on?"
    : asksAboutAi
      ? "Yes. I can explain AI concepts clearly and keep the answer practical. Do you want a short explanation or a deeper comparison?"
      : asksAboutTom
        ? "I can explain how TOM works and what it can help with in day-to-day use."
        : "I can help with that. Tell me the exact angle you want, and I will keep it concise.";

  return {
    title: asksAboutCars ? "Cars and BMW" : "Quick answer",
    summary,
    voice_summary: summary,
    sections: [],
    tables: [],
    next_actions: asksAboutTom
      ? [{
          label: "Switch back to TOM Operations",
          rationale: "Go back to app navigation.",
          action_type: "open",
          payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" },
        }]
      : [],
    context_cards: [],
    data_used: [],
    confidence: { level: "medium", rationale: "Deterministic conversational guidance without external tools." },
    signal_strength: { level: "low", score: 5, rationale: "No data sources used for this response." },
  };
}
