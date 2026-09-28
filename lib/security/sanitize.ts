const sensitiveKeyPattern = /(^|_)(password|secret|token)($|_)/i;

export function stripSensitiveFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripSensitiveFields(item)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !sensitiveKeyPattern.test(key))
        .map(([key, item]) => [key, stripSensitiveFields(item)]),
    ) as T;
  }
  return value;
}
