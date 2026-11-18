import { expect, it } from "vitest";
import { validateWorkspace } from "./validate";
import { sample } from "./sample";
it("accepts a full workspace and rejects malformed IPC input", () => {
  expect(validateWorkspace(sample()).version).toBe(3);
  for (const value of [
    null,
    {},
    { ...sample(), roster: [{ id: 3 }] },
    { ...sample(), levels: { person: { skill: 9 } } },
    { ...sample(), overrides: { pod: { start: "2026-02-30" } } },
  ])
    expect(() => validateWorkspace(value)).toThrow();
});
it("migrates v1 while retaining skills and local roster IDs", () => {
  const old: any = sample();
  old.version = 1;
  delete old.areaPaths;
  delete old.baseItems;
  delete old.taskTemplates;
  delete old.manualIds;
  const next = validateWorkspace(old);
  expect(next.version).toBe(3);
  expect(next.roster[0].id).toBe(old.roster[0].id);
  expect(next.levels).toEqual(old.levels);
  expect(next.taskTemplates[0].prefixes).toEqual(["BUILD", "VAL"]);
});
it("migrates persisted v2 story collections without changing pod identity", () => {
  const old: any = sample();
  old.version = 2;
  old.pods = old.pods.map((p: any) => {
    const { workItems, ...rest } = p;
    return { ...rest, stories: workItems };
  });
  const next = validateWorkspace(old);
  expect(next.version).toBe(3);
  expect(next.pods[0].workItems.map((i) => i.id)).toEqual(
    old.pods[0].stories.map((i: any) => i.id),
  );
  expect(next.pods[0].id).toBe(old.pods[0].id);
});
