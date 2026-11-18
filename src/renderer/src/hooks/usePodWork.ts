import { useEffect, useState } from "react";
import type { Item, Pod } from "@shared/model";
import { isTask } from "@/ui/WorkItemType";
import { api as bridge } from "./api";

const isPodWork = (item: Item) =>
  isTask(item.type) || /^(bug|user story)$/i.test(item.type ?? "");

export function usePodWork(pod: Pod, connected: boolean) {
  const [children, setChildren] = useState<Record<number, Item[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [attempt, retry] = useState(0);

  useEffect(() => {
    const api = bridge();
    if (!api || !connected) return;
    let active = true;
    const reads = new Map<number, Promise<Item[]>>();
    const load = (item: Item, force = false): Promise<Item[]> => {
      const pending = reads.get(item.id);
      if (pending && !force) return pending;
      const request: Promise<Item[]> = Promise.resolve().then(async () => {
        try {
          const result = await api.item(item.id);
          if (!result.ok) throw Error(result.message);
          const items = (result.value.children ?? []).filter(isPodWork);
          if (active && reads.get(item.id) === request) {
            setChildren((previous) => ({ ...previous, [item.id]: items }));
            setErrors((previous) => {
              const next = { ...previous };
              delete next[item.id];
              return next;
            });
          }
          return items;
        } catch (error) {
          if (active && reads.get(item.id) === request)
            setErrors((previous) => ({
              ...previous,
              [item.id]: String(error),
            }));
          return item.children ?? [];
        }
      });
      reads.set(item.id, request);
      return request;
    };
    const queue = [
      pod.feature,
      ...pod.workItems.filter((item) => !isTask(item.type)),
    ];
    const parents = new Map(queue.map((item) => [item.id, item]));
    async function readAll() {
      setBusy(true);
      while (active && queue.length) {
        const batches = await Promise.all(
          queue.splice(0, 4).map((item) => load(item)),
        );
        for (const item of batches.flat()) {
          if (!isTask(item.type) && !parents.has(item.id)) {
            parents.set(item.id, item);
            queue.push(item);
          }
        }
      }
      if (active) setBusy(false);
    }
    const changed = (event: Event) => {
      const parent = parents.get((event as CustomEvent<number>).detail);
      if (parent) void load(parent, true);
    };
    void Promise.resolve().then(() => {
      if (active) return readAll();
    });
    window.addEventListener("work-items:changed", changed);
    return () => {
      active = false;
      window.removeEventListener("work-items:changed", changed);
    };
  }, [pod, connected, attempt]);

  const roots = [
    ...new Map(
      [
        ...pod.workItems,
        ...(children[pod.feature.id] ?? pod.feature.children ?? []).filter(
          isPodWork,
        ),
      ].map((item) => [item.id, item]),
    ).values(),
  ];
  const work: Item[] = [];
  const seen = new Set([pod.feature.id]);
  function collect(items: Item[]) {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      work.push(item);
      if (!isTask(item.type)) collect(children[item.id] ?? item.children ?? []);
    }
  }
  collect(roots);
  return {
    roots,
    work,
    children,
    busy,
    errors,
    retry: () => retry(attempt + 1),
  };
}
