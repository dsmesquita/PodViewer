export interface Person {
  id: string;
  name: string;
  account?: string;
  tfsId?: string;
}
export interface Item {
  assigneeName?: string;
  assigneeId?: string;
  parentId?: number;
  type?: string;
  areaPath?: string;
  iterationPath?: string;
  assignedTo?: string;
  tags?: string;
  children?: Item[];
  id: number;
  title: string;
  state: string;
  url: string;
  column?: string;
}
export interface Pod {
  id: string;
  laneId: string;
  lane: string;
  feature: Item;
  cm?: Item;
  owner?: Person;
  members: Person[];
  created?: string;
  expected?: string;
  workItems: Item[];
  missing?: boolean;
}
export interface Override {
  name?: string;
  start?: string;
  expected?: string;
  members?: string[];
  closed?: string;
  dismissed?: boolean;
}
export interface Workspace {
  version: 3;
  areasInitialized?: boolean;
  areaPaths: string[];
  manualIds: number[];
  baseItems: Item[];
  taskTemplates: { name: string; prefixes: string[] }[];
  boardUrl: string;
  baseLane: string;
  owners: string[];
  ownerInitialized: boolean;
  pods: Pod[];
  roster: Person[];
  overrides: Record<string, Override>;
  skills: string[];
  levels: Record<string, Record<string, number>>;
  history: { at: string; podId: string; members: string[] }[];
  refreshed?: string;
  diagnostics: string[];
  fields: { members: string[]; planned: string };
  availableFields: { name: string; referenceName: string }[];
  lanes: { id: string; name: string }[];
}
export const emptyWorkspace = (): Workspace => ({
  version: 3,
  areaPaths: [],
  manualIds: [],
  baseItems: [],
  taskTemplates: [{ name: "BUILD + VAL", prefixes: ["BUILD", "VAL"] }],
  boardUrl: "",
  baseLane: "",
  owners: [],
  ownerInitialized: false,
  pods: [],
  roster: [],
  overrides: {},
  skills: [],
  levels: {},
  history: [],
  diagnostics: [],
  fields: { members: [], planned: "" },
  availableFields: [],
  lanes: [],
});
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function dateOf(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return;
  const d = new Date(value);
  if (isNaN(d.getTime())) return;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function same(a: Person, b: Person): boolean {
  return (
    a.id === b.id ||
    a.tfsId === b.id ||
    b.tfsId === a.id ||
    !!(
      a.account &&
      b.account &&
      a.account.toLowerCase() === b.account.toLowerCase()
    )
  );
}
export function members(w: Workspace, p: Pod): Person[] {
  const ids = w.overrides[p.id]?.members;
  return ids === undefined
    ? p.members
    : ids
        .map(
          (id) =>
            w.roster.find((m) => m.id === id) ||
            w.pods.flatMap((p) => p.members).find((m) => m.id === id),
        )
        .filter((x): x is Person => !!x);
}
export function assignments(w: Workspace, m: Person): Pod[] {
  return w.pods.filter(
    (p) => !w.overrides[p.id]?.closed && members(w, p).some((x) => same(x, m)),
  );
}
export function visible(w: Workspace, past: boolean): Pod[] {
  if (!w.ownerInitialized) return [];
  return w.pods.filter(
    (p) =>
      (!w.areasInitialized ||
        w.areaPaths.some(
          (a) =>
            p.feature.areaPath?.toLowerCase() === a.toLowerCase() ||
            p.feature.areaPath
              ?.toLowerCase()
              .startsWith(a.toLowerCase() + "\\"),
        )) &&
      (past || !w.overrides[p.id]?.closed) &&
      (!w.owners.length || (!!p.owner && w.owners.includes(p.owner.id))),
  );
}
export function reconcile(w: Workspace, fresh: Pod[]): Workspace {
  fresh = fresh.map((p) => {
    const old = w.pods.find((x) => x.id === p.id);
    return !p.cm && old?.cm ? { ...p, members: old.members } : p;
  });
  const initial = !w.refreshed;
  const overrides = { ...w.overrides };
  const history = [...w.history];
  for (const p of fresh) {
    if (!w.pods.some((old) => old.id === p.id))
      overrides[p.id] = {
        ...overrides[p.id],
        ...(initial ? { start: "2026-11-16" } : {}),
      };
    const old = w.pods.find((x) => x.id === p.id);
    if (
      old &&
      !/^(resolved|closed)$/i.test(old.feature.state) &&
      /^(resolved|closed)$/i.test(p.feature.state)
    )
      overrides[p.id] = { ...overrides[p.id], dismissed: false };
    if (!old || JSON.stringify(old.members) !== JSON.stringify(p.members))
      history.push({
        at: new Date().toISOString(),
        podId: p.id,
        members: p.members.map((m) => m.id),
      });
  }
  const pods = [
    ...fresh.map((p) =>
      w.overrides[p.id]?.closed
        ? w.pods.find((old) => old.id === p.id) || p
        : p,
    ),
    ...w.pods
      .filter((p) => !fresh.some((n) => n.id === p.id))
      .map((p) => ({ ...p, missing: true })),
  ];
  let owners = w.owners;
  let ownerInitialized = w.ownerInitialized;
  if (!ownerInitialized) {
    const found = [
      ...new Map(
        fresh
          .filter((p) => p.owner?.name === "Renato Ribeiro")
          .map((p) => [p.owner!.id, p.owner!]),
      ).values(),
    ];
    if (found.length === 1) {
      owners = [found[0].id];
      ownerInitialized = true;
    }
  }
  return {
    ...w,
    pods,
    overrides,
    history,
    owners,
    ownerInitialized,
    refreshed: new Date().toISOString(),
  };
}
export function edit(
  w: Workspace,
  id: string,
  patch: Partial<Override>,
): Workspace {
  return {
    ...w,
    overrides: { ...w.overrides, [id]: { ...w.overrides[id], ...patch } },
    history:
      patch.members || patch.closed
        ? [
            ...w.history,
            {
              at: new Date().toISOString(),
              podId: id,
              members: patch.closed ? [] : patch.members!,
            },
          ]
        : w.history,
  };
}
export function move(w: Workspace, personId: string, podId: string): Workspace {
  let next = w;
  const person = w.roster.find((m) => m.id === personId);
  if (!person) return w;
  for (const p of assignments(w, person))
    if (p.id !== podId)
      next = edit(next, p.id, {
        members: members(next, p)
          .filter((m) => !same(m, person))
          .map((m) => w.roster.find((r) => same(r, m))?.id || m.id)
          .filter((id): id is string => !!id),
      });
  return edit(next, podId, {
    members: [
      ...new Set([
        ...members(
          next,
          next.pods.find((p) => p.id === podId)!,
        )
          .map((m) => w.roster.find((r) => same(r, m))?.id || m.id)
          .filter((id): id is string => !!id),
        personId,
      ]),
    ],
  });
}
export function range(
  w: Workspace,
  pods: Pod[],
  now = today(),
): { start: string; end: string; days: number } {
  const start =
    pods
      .map((p) => w.overrides[p.id]?.start || p.created)
      .filter((x): x is string => !!x)
      .sort()[0] || now;
  const end = new Date(Date.parse(now) + 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  return {
    start: start < now ? start : now,
    end,
    days:
      Math.round(
        (Date.parse(end) - Date.parse(start < now ? start : now)) / 86400000,
      ) + 1,
  };
}

export function assignedMember(
  item: Item,
  roster: Person[],
): Person | undefined {
  const normalize = (value?: string) =>
    value?.trim().toLowerCase() || undefined;
  const account = normalize(item.assignedTo);
  const name = normalize(item.assigneeName);
  const id = normalize(item.assigneeId);
  const memberId = (member: Person) => normalize(member.tfsId ?? member.id);
  const exact = roster.filter(
    (member) =>
      (id && id === memberId(member)) ||
      (account && account === normalize(member.account)),
  );
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  if (!name) return;
  const named = roster.filter((member) => normalize(member.name) === name);
  if (named.length !== 1) return;
  const [member] = named;
  const knownId = normalize(member.tfsId);
  const knownAccount = normalize(member.account);
  if (
    (id && knownId && id !== knownId) ||
    (account && account !== name && knownAccount && account !== knownAccount)
  )
    return;
  return member;
}
