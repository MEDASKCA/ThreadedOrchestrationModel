export type ActorDisplayInput = {
  id?: string;
  name?: string;
  type?: string;
  isSystem?: boolean;
};

export function formatActorDisplayName(input: ActorDisplayInput): string {
  const { id, name, type, isSystem } = input;
  if (isSystem || type === "system" || id === "system" || name === "System") {
    return "TOM";
  }
  if (name && name.trim()) return name;
  if (id && id.trim()) return id;
  return "Unknown";
}
