import { useEffect, useState } from "react";
import type { Item } from "../../../shared/model";
export function useWorkItemChildren(item: Item) {
  const [children, setChildren] = useState(item.children);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await window.api?.item(item.id);
      if (r?.ok) setChildren(r.value.children || []);
      else
        setError(
          r && !r.ok
            ? r.message
            : "Connect through the desktop app to load Tasks",
        );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const changed = (event: Event) => {
      if (
        (event as CustomEvent<number>).detail === item.id &&
        children !== undefined
      )
        void load();
    };
    window.addEventListener("work-items:changed", changed);
    return () => window.removeEventListener("work-items:changed", changed);
  }, [item.id, children]);
  return { children, busy, error, load };
}
