import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "@shared/model";
import { call } from "./api";

/** Lazily reads a work item's children; reloads after tasks are created under it. */
export function useWorkItemChildren(item: Item) {
  const [children, setChildren] = useState(item.children);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    setError("");
    const result = await call((api) => api.item(item.id));
    if (result.ok) setChildren(result.value.children || []);
    else setError(result.message);
    loading.current = false;
    setBusy(false);
  }, [item.id]);

  const loaded = children !== undefined;
  useEffect(() => {
    const changed = (event: Event) => {
      if ((event as CustomEvent<number>).detail === item.id && loaded)
        void load();
    };
    window.addEventListener("work-items:changed", changed);
    return () => window.removeEventListener("work-items:changed", changed);
  }, [item.id, loaded, load]);

  return { children, busy, error, load };
}
