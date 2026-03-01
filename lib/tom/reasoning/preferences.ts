import type { TomContext } from "@/lib/tom/context";

export function extractPreferences(message: string): Partial<NonNullable<TomContext["preferences"]>> {
  const text = message.toLowerCase();
  const preferences: Partial<NonNullable<TomContext["preferences"]>> = {};

  if (text.includes("short") || text.includes("brief") || text.includes("tl;dr")) {
    preferences.verbosity = "short";
  } else if (text.includes("detailed") || text.includes("more detail") || text.includes("deep dive")) {
    preferences.verbosity = "detailed";
  }

  if (text.includes("bullets") || text.includes("bullet points") || text.includes("list")) {
    preferences.format = "bullets";
  } else if (text.includes("paragraph") || text.includes("narrative")) {
    preferences.format = "narrative";
  }

  if (text.includes("formal")) {
    preferences.tone = "formal";
  } else if (text.includes("friendly")) {
    preferences.tone = "friendly";
  } else if (text.includes("neutral")) {
    preferences.tone = "neutral";
  }

  return preferences;
}
