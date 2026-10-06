const allowedPostAuthPaths = new Set(["/dashboard", "/access"]);

export function getSafePostAuthPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";

  try {
    const parsed = new URL(value, "https://zqx.invalid");
    if (parsed.origin !== "https://zqx.invalid" || !allowedPostAuthPaths.has(parsed.pathname)) return "/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
