import type { TomContext } from "@/lib/tom/context";
import type { RichNextAction } from "@/lib/tom/rich-response";

export const buildContinueActionFromTopic = (topic: TomContext["last_topic"]): RichNextAction | null => {
  if (!topic) return null;
  if (topic.kind === "view" && topic.id) {
    const [section, view] = topic.id.split(".");
    if (section && view) {
      return {
        label: `Continue: ${topic.label || view}`,
        rationale: "Continue where we left off.",
        action_type: "open",
        payload: { type: "open_view", deeplink: `/?section=${section}&view=${view}`, label: topic.label || view },
      };
    }
  }
  if (topic.kind === "section" && topic.id) {
    return {
      label: `Continue: ${topic.label || topic.id}`,
      rationale: "Return to previous section.",
      action_type: "open",
      payload: { type: "open_view", deeplink: `/?section=${topic.id}`, label: topic.label || topic.id },
    };
  }
  if (topic.kind === "canvas") {
    return {
      label: `Continue: ${topic.label || "Canvas"}`,
      rationale: "Reopen canvas workspace.",
      action_type: "open",
      payload: { type: "open_canvas", canvas: { title: topic.label || "Canvas", markdown: "# Continue\n- [ ] Pick up where we left off" } },
    };
  }
  return null;
};

