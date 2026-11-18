export type ThemePreference = "system" | "light" | "dark";
export type ThemeMode = "light" | "dark";

const key = "pod-viewer.theme";
const listeners = new Set<() => void>();
let current: ThemePreference | undefined;

const isPreference = (value: unknown): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

/**
 * A per-machine UI preference, kept in localStorage rather than the workspace.
 * Storage can be missing or throw (tests, locked-down profiles); that means "system".
 */
export function getPreference(): ThemePreference {
  if (current) return current;
  try {
    const stored = globalThis.localStorage?.getItem(key);
    current = isPreference(stored) ? stored : "system";
  } catch {
    current = "system";
  }
  return current;
}

export function setPreference(next: ThemePreference) {
  current = next;
  try {
    globalThis.localStorage?.setItem(key, next);
  } catch {
    /* Applies for this session only. */
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const resolveTheme = (
  preference: ThemePreference,
  systemDark: boolean,
): ThemeMode =>
  preference === "system" ? (systemDark ? "dark" : "light") : preference;

/** Test hook: forget the cached value so the next read goes to storage. */
export function resetPreferenceCache() {
  current = undefined;
}
