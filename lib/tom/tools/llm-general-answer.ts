import type { ToolResult } from "@/lib/tom/tools/types";

const TOM_GENERAL_SYSTEM = `You are TOM — an NHS healthcare operations intelligence system. You're knowledgeable, direct, warm, and genuinely helpful.

Your primary focus is NHS operational data — PTL, RTT, rosters, capacity, pathways. But you're also a capable assistant with general knowledge and you can answer questions outside that domain.

When the question is about TOM's features, NHS operations, or connected data: answer confidently and specifically.
When the question is general knowledge (news, cars, science, everyday questions): answer it helpfully from your knowledge, briefly noting you're primarily an NHS tool if relevant.
When you genuinely don't know: say so plainly. Never invent clinical data or patient information.

Rules:
- Never start with filler: no "Sure!", "Of course!", "Certainly!", "Understood."
- Be concise. One clear answer. Don't over-explain.
- Sound like a smart colleague who happens to know the answer, not a corporate assistant.
- If the question is clearly about NHS operations and you have no data, say so and suggest they ask for a specific data view.`;

export type LlmGeneralAnswerInput = {
  prompt: string;
  page_context?: { section?: string; view?: string } | null;
};

export const runLlmGeneralAnswer = async (input: LlmGeneralAnswerInput): Promise<ToolResult<{ answer: string }>> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: true, source: "LLM", data: { answer: "I can help with that — could you give me a bit more detail about what you're looking for?" } };
  }
  const model = process.env.TOM_LLM_MODEL || "gpt-4o";

  const userMessage = input.page_context?.view
    ? `[User is currently on: ${input.page_context.section ?? ""}${input.page_context.view ? ` > ${input.page_context.view}` : ""}]\n\n${input.prompt}`
    : input.prompt;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 400,
        messages: [
          { role: "system", content: TOM_GENERAL_SYSTEM },
          { role: "user", content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: true, source: "LLM", data: { answer: "I can help with that — could you tell me a bit more about what you need?" } };
    }
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content ?? "";
    const clean = typeof answer === "string" ? answer.trim() : "";
    return {
      ok: true,
      source: "LLM",
      data: { answer: clean || "I can help with that — tell me exactly what you want to focus on." },
    };
  } catch {
    return { ok: true, source: "LLM", data: { answer: "I can help — tell me what angle you want to look at." } };
  }
};
