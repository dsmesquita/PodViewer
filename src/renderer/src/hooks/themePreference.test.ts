import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPreference,
  resetPreferenceCache,
  resolveTheme,
  setPreference,
  subscribe,
} from "./themePreference";

describe("theme preference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetPreferenceCache();
  });

  it("resolves the rendered theme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system when storage is missing, invalid or throws", () => {
    expect(getPreference()).toBe("system");
    resetPreferenceCache();
    vi.stubGlobal("localStorage", { getItem: () => "purple" });
    expect(getPreference()).toBe("system");
    resetPreferenceCache();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    });
    expect(getPreference()).toBe("system");
    setPreference("dark");
    expect(getPreference()).toBe("dark");
  });

  it("stores the choice and notifies subscribers", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setPreference("light");
    unsubscribe();
    expect(listener).toHaveBeenCalledOnce();
    resetPreferenceCache();
    expect(getPreference()).toBe("light");
  });
});
