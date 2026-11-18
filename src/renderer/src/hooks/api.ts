import type { Result } from "@shared/api";

/** Shown wherever a feature needs the main process and no API is available. */
export const desktopOnly = "Run the desktop app to reach TFS.";

export const api = () => window.api;

/** Converts a missing API into a failed Result so callers handle one shape. */
export async function call<T>(
  request: (a: NonNullable<Window["api"]>) => Promise<Result<T>>,
): Promise<Result<T>> {
  const bridge = api();
  if (!bridge) return { ok: false, message: desktopOnly };
  try {
    return await request(bridge);
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}
