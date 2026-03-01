// lib/tom/knowledge/loader.ts
// Loads and caches JSON files from /knowledge/.
// In dev: 5-second TTL (hot-reload). In prod: 60-second TTL.
// Errors are caught and return safe fallbacks — the knowledge layer never crashes the request.

import fs from "fs";
import path from "path";
import type { KnowledgeTrigger, KnowledgeResponse, KnowledgeModule } from "./types";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const CACHE_TTL_MS = process.env.NODE_ENV === "development" ? 5_000 : 60_000;

interface CacheEntry {
  data: unknown;
  loaded_at: number;
  checksum: string;
}

const cache = new Map<string, CacheEntry>();

function checksum(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function loadFile<T>(relativePath: string): T {
  const cached = cache.get(relativePath);
  if (cached && Date.now() - cached.loaded_at < CACHE_TTL_MS) return cached.data as T;

  const fullPath = path.join(KNOWLEDGE_DIR, relativePath);
  let raw: string;
  try {
    raw = fs.readFileSync(fullPath, "utf-8");
  } catch {
    throw new Error(`[knowledge] Cannot read: ${relativePath}`);
  }

  let data: T;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`[knowledge] Invalid JSON in: ${relativePath}`);
  }

  cache.set(relativePath, { data, loaded_at: Date.now(), checksum: checksum(raw) });
  return data;
}

const MODULES: KnowledgeModule[] = ["operations", "logistics", "collaboration", "intelligence", "configurator"];

export function loadTriggers(module: KnowledgeModule): KnowledgeTrigger[] {
  try {
    return loadFile<KnowledgeTrigger[]>(`${module}/triggers.json`);
  } catch {
    return [];
  }
}

export function loadResponses(module: KnowledgeModule): Record<string, KnowledgeResponse> {
  try {
    return loadFile<Record<string, KnowledgeResponse>>(`${module}/responses.json`);
  } catch {
    return {};
  }
}

export function getAllTriggers(): KnowledgeTrigger[] {
  return MODULES.flatMap(m => loadTriggers(m));
}

export function getResponse(module: KnowledgeModule, responseKey: string): KnowledgeResponse | null {
  const responses = loadResponses(module);
  return responses[responseKey] ?? null;
}

export function getKnowledgePackVersion(): string {
  try {
    const pkg = loadFile<{ version?: string }>("_version.json");
    return pkg.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
}
