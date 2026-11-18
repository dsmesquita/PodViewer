import { useEffect, useSyncExternalStore } from "react";
import {
  getPreference,
  resolveTheme,
  setPreference,
  subscribe,
} from "./themePreference";

const query = "(prefers-color-scheme: dark)";

function subscribeSystem(onChange: () => void) {
  const media = matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The theme to render: the Settings choice, or the Windows setting when it follows the system. */
export function useThemeMode() {
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => matchMedia(query).matches,
  );
  const preference = useSyncExternalStore(subscribe, getPreference);
  const mode = resolveTheme(preference, systemDark);
  useEffect(() => {
    // Native controls such as scrollbars and date pickers follow this.
    document.documentElement.style.colorScheme = mode;
  }, [mode]);
  return { mode, systemDark, preference, setPreference };
}
