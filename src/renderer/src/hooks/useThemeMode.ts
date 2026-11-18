import { useEffect, useSyncExternalStore } from "react";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Follows the Windows (or browser) light/dark setting. */
export function useThemeMode(): "light" | "dark" {
  const dark = useSyncExternalStore(subscribe, () => matchMedia(query).matches);
  useEffect(() => {
    // Native controls such as scrollbars and date pickers follow this.
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);
  return dark ? "dark" : "light";
}
