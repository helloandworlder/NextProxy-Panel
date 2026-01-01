/**
 * Universal JSON type definitions
 * Similar to Go's json.RawMessage / interface{} pattern used in 3x-ui and Sing-box
 */

// Primitive JSON values (excluding null for better form compatibility)
export type JsonPrimitive = string | number | boolean;

// Recursive JSON value type
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject | null;

// JSON object type - the most commonly used for configs
// Using Record<string, unknown> for better compatibility with Ant Design forms
export type JsonObject = Record<string, unknown>;

// Type guard functions
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is JsonValue[] {
  return Array.isArray(value);
}

// Safe JSON parse with type
export function parseJson<T = JsonObject>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Pretty print JSON
export function formatJson(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent);
}
