import type { Workspace } from "./model";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown) => typeof v === "string";
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(string);
const optionalString = (v: unknown) => v === undefined || string(v);
const person = (v: unknown) =>
  record(v) && string(v.id) && string(v.name) && optionalString(v.account);
const date = (v: unknown) =>
  v === undefined ||
  (typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v);
const item = (v: unknown) => {
  if (
    !record(v) ||
    !Number.isInteger(v.id) ||
    !string(v.title) ||
    !string(v.state) ||
    typeof v.url !== "string"
  )
    return false;
  try {
    return ["http:", "https:"].includes(new URL(v.url).protocol);
  } catch {
    return false;
  }
};
export function validateWorkspace(value: unknown): Workspace {
  if (!record(value)) throw Error("Invalid workspace");
  if (value.version === 1)
    value = {
      ...value,
      version: 2,
      areaPaths: [],
      manualIds: [],
      baseItems: [],
      taskTemplates: [{ name: "BUILD + VAL", prefixes: ["BUILD", "VAL"] }],
    };
  if ((value as Record<string, unknown>).version === 2) {
    const old = value as Record<string, unknown>;
    value = {
      ...old,
      version: 3,
      pods: (old.pods as Record<string, unknown>[]).map((p) => ({
        ...p,
        workItems: p.workItems || p.stories || [],
      })),
    };
  }
  const w = value as Record<string, unknown>;
  const valid =
    w.version === 3 &&
    strings(w.areaPaths) &&
    Array.isArray(w.manualIds) &&
    w.manualIds.every(Number.isSafeInteger) &&
    Array.isArray(w.baseItems) &&
    w.baseItems.every(item) &&
    Array.isArray(w.taskTemplates) &&
    w.taskTemplates.every(
      (t) => record(t) && string(t.name) && strings(t.prefixes),
    ) &&
    typeof w.boardUrl === "string" &&
    string(w.baseLane) &&
    typeof w.ownerInitialized === "boolean" &&
    strings(w.owners) &&
    strings(w.skills) &&
    strings(w.diagnostics) &&
    Array.isArray(w.roster) &&
    w.roster.every(person) &&
    Array.isArray(w.pods) &&
    w.pods.every(
      (p) =>
        record(p) &&
        string(p.id) &&
        string(p.laneId) &&
        string(p.lane) &&
        item(p.feature) &&
        (p.cm === undefined || item(p.cm)) &&
        (p.owner === undefined || person(p.owner)) &&
        Array.isArray(p.members) &&
        p.members.every(person) &&
        Array.isArray(p.workItems) &&
        p.workItems.every(item) &&
        date(p.created) &&
        date(p.expected),
    ) &&
    record(w.overrides) &&
    Object.values(w.overrides).every(
      (o) =>
        record(o) &&
        optionalString(o.name) &&
        date(o.start) &&
        date(o.expected) &&
        date(o.closed) &&
        (o.members === undefined || strings(o.members)),
    ) &&
    record(w.levels) &&
    Object.values(w.levels).every(
      (levels) =>
        record(levels) &&
        Object.values(levels).every(
          (n) =>
            typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 4,
        ),
    ) &&
    Array.isArray(w.history) &&
    w.history.every(
      (h) =>
        record(h) &&
        typeof h.at === "string" &&
        !isNaN(Date.parse(h.at)) &&
        string(h.podId) &&
        strings(h.members),
    ) &&
    record(w.fields) &&
    strings(w.fields.members) &&
    string(w.fields.planned) &&
    Array.isArray(w.availableFields) &&
    w.availableFields.every(
      (f) => record(f) && string(f.name) && string(f.referenceName),
    ) &&
    Array.isArray(w.lanes) &&
    w.lanes.every((l) => record(l) && string(l.id) && string(l.name));
  if (!valid)
    throw Error(
      "Invalid workspace format; the saved workspace was not replaced.",
    );
  return value as unknown as Workspace;
}
