import { createHash } from "node:crypto";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}
