import {
  emptyWorkspace,
  today,
  type Item,
  type Person,
  type Pod,
  type Workspace,
} from "../../shared/model";

/**
 * Fictional data written to mock/ on first use. Every name, ID and URL is invented, and
 * the .invalid host can never resolve. Dates are relative to today so the timeline stays current.
 */
export interface MockConfig {
  /** Delay added to every mock call, to exercise loading states. */
  delayMs: number;
  /** Work-item IDs whose detail reads fail, to exercise error states. */
  failItemIds: number[];
  /** When true, Refresh fails as if TFS were unreachable. */
  failRefresh: boolean;
}

export interface MockData {
  workspace: Workspace;
  workItems: Item[];
  people: Person[];
  config: MockConfig;
}

const host = "https://tfs.example.invalid/tfs/DefaultCollection";
const url = (id: number) => `${host}/Product/_workitems/edit/${id}`;
const shift = (days: number, from = today()) =>
  new Date(Date.parse(from) + days * 86400000).toISOString().slice(0, 10);

const people: Person[] = [
  ["Ana Martins", "amartins"],
  ["Miguel Costa", "mcosta"],
  ["Sofia Silva", "ssilva"],
  ["Pedro Santos", "psantos"],
  ["Inês Ferreira", "iferreira"],
  ["João Sousa", "jsousa"],
  ["Beatriz Lopes", "blopes"],
  ["Tiago Rocha", "trocha"],
  ["Marta Pinto", "mpinto"],
  ["Carlos Nunes", "cnunes"],
  ["Rui Almeida", "ralmeida"],
  ["Renato Ribeiro", "rribeiro"],
].map(([name, user]) => ({
  id: "tfs-" + user,
  name,
  account: "EXAMPLE\\" + user,
}));
const byName = (name: string) => people.find((p) => p.name === name)!;
const assignee = (name?: string) => {
  if (!name) return {};
  const p = byName(name);
  return { assigneeName: p.name, assigneeId: p.id, assignedTo: p.account };
};

let nextTask = 90000;
function item(
  id: number,
  type: string,
  title: string,
  state: string,
  owner?: string,
  children: Item[] = [],
): Item {
  return {
    id,
    type,
    title,
    state,
    url: url(id),
    areaPath: "Product\\MES",
    iterationPath: "Product\\Sprint 42",
    tags: "",
    ...assignee(owner),
    children,
  };
}
const task = (title: string, state: string, owner?: string) =>
  item(nextTask++, "Task", title, state, owner);

interface PodSpec {
  lane: string;
  feature: [number, string, string, string];
  cm?: number;
  members: string[];
  started?: number;
  expected?: number;
  work: Item[];
}

const pods: PodSpec[] = [
  {
    lane: "Pod Atlas",
    feature: [41001, "Batch execution redesign", "Active", "In Progress"],
    cm: 51001,
    members: ["Ana Martins", "Miguel Costa", "Sofia Silva"],
    started: -34,
    expected: 21,
    work: [
      item(42001, "User Story", "Operator can pause a batch step", "Closed", "Ana Martins", [
        task("BUILD:: Pause step API", "Closed", "Ana Martins"),
        task("VAL:: Pause step API", "Closed", "Sofia Silva"),
      ]),
      item(42002, "User Story", "Resume batch after equipment fault", "Active", "Miguel Costa", [
        task("BUILD:: Resume flow", "Active", "Miguel Costa"),
        task("VAL:: Resume flow", "New", "Sofia Silva"),
      ]),
      item(42003, "User Story", "Audit trail for step transitions", "New", "Sofia Silva"),
      item(42004, "Bug", "Step timer drifts after daylight-saving change", "Active", "Ana Martins", [
        task("BUILD:: Use Lisbon calendar dates", "Active", "Ana Martins"),
      ]),
    ],
  },
  {
    lane: "Pod Orbit",
    feature: [41002, "Electronic signatures", "New", "Ready"],
    cm: 51002,
    members: ["Pedro Santos", "Beatriz Lopes"],
    started: -9,
    work: [
      item(42011, "User Story", "Sign-off dialog with reason codes", "New", "Pedro Santos"),
      item(42012, "User Story", "Second-person verification", "New", "Beatriz Lopes"),
    ],
  },
  {
    lane: "Pod Trace",
    feature: [41003, "Production traceability", "Resolved", "Done"],
    cm: 51003,
    members: ["Tiago Rocha", "Rui Almeida"],
    started: -61,
    expected: -2,
    work: [
      item(42021, "User Story", "Genealogy view per lot", "Closed", "Tiago Rocha"),
      item(42022, "Bug", "Lot search ignores suffix", "Closed", "Rui Almeida"),
    ],
  },
  {
    lane: "Pod Nova",
    feature: [41004, "Recipe versioning", "Active", "In Progress"],
    cm: 51004,
    members: ["Marta Pinto", "Miguel Costa"],
    expected: 45,
    work: [
      item(42031, "User Story", "Compare two recipe versions", "Active", "Marta Pinto", [
        task("BUILD:: Diff renderer", "Active", "Marta Pinto"),
      ]),
      item(42032, "User Story", "Approve recipe release", "New"),
    ],
  },
  {
    lane: "Pod Echo",
    feature: [41005, "Label printing migration", "Closed", "Done"],
    cm: 51005,
    members: ["Carlos Nunes"],
    started: -90,
    expected: -40,
    work: [
      item(42041, "User Story", "Migrate label templates", "Closed", "Carlos Nunes"),
    ],
  },
];

export function mockSeed(): MockData {
  nextTask = 90000;
  const w = emptyWorkspace();
  const owner = byName("Renato Ribeiro");
  w.boardUrl = `${host}/Product/Team/_boards/board/t/Team/Features`;
  w.areaPaths = ["Product"];
  w.areasInitialized = true;
  w.owners = [owner.id];
  w.ownerInitialized = true;
  w.roster = people
    .filter((p) => p !== owner && p.name !== "Rui Almeida")
    .map((p, i) => ({ ...p, id: "member-" + i, tfsId: p.id }));
  // One roster entry without a TFS identity, to show the unmapped state.
  w.roster.push({ id: "member-new", name: "Daniela Faria" });
  w.skills = ["MES configuration", "TypeScript", "Validation", "Architecture", "SQL"];
  const level = (name: string, ratings: Record<string, number>) => {
    w.levels[w.roster.find((m) => m.name === name)!.id] = ratings;
  };
  level("Ana Martins", { "MES configuration": 4, TypeScript: 3 });
  level("Miguel Costa", { Architecture: 4, SQL: 3 });
  level("Sofia Silva", { Validation: 4 });
  level("Pedro Santos", { TypeScript: 2 });
  level("Inês Ferreira", { "MES configuration": 3, Validation: 3 });
  level("João Sousa", { SQL: 4, Architecture: 2 });
  w.lanes = [
    ...pods.map((p, i) => ({ id: "lane-" + i, name: p.lane })),
    { id: "lane-delta", name: "Pod Delta" },
    { id: "lane-base", name: "Base" },
  ];
  w.baseLane = "lane-base";
  w.pods = pods.map((spec, i): Pod => {
    const [id, title, state, column] = spec.feature;
    const cm = spec.cm
      ? item(spec.cm, "CM POD", spec.lane, "Active", owner.name)
      : undefined;
    return {
      id: "board:cm" + (spec.cm ?? id),
      laneId: "lane-" + i,
      lane: spec.lane,
      feature: { ...item(id, "Feature", title, state), column },
      cm,
      owner,
      members: spec.members.map(byName),
      created: spec.started === undefined ? undefined : shift(spec.started),
      expected: spec.expected === undefined ? undefined : shift(spec.expected),
      workItems: spec.work,
    };
  });
  const echo = w.pods[4];
  w.overrides[echo.id] = { closed: shift(-38), start: shift(-90) };
  w.history = w.pods.map((p) => ({
    at: new Date().toISOString(),
    podId: p.id,
    members: p.members.map((m) => m.id),
  }));
  w.baseItems = [
    item(41010, "Feature", "Shift handover report", "New"),
    item(41011, "Feature", "Equipment maintenance calendar", "Active"),
    item(42050, "Bug", "Report export truncates long names", "Active", "João Sousa", [
      task("BUILD:: Widen export column", "New", "João Sousa"),
    ]),
  ];
  w.manualIds = [42050];
  w.diagnostics = [
    "Pod Delta: no linked CM POD; cannot match an owner filter.",
    "Map the ambiguous Planned Close Date field in Settings.",
  ];
  w.availableFields = [
    { name: "Pod Member 1", referenceName: "Custom.PodMember1" },
    { name: "Pod Member 2", referenceName: "Custom.PodMember2" },
    { name: "Pod Member 3", referenceName: "Custom.PodMember3" },
    { name: "Planned Close Date", referenceName: "Custom.PlannedCloseDate" },
    { name: "Planned Close Date:", referenceName: "Custom.PlannedClose2" },
  ];
  w.refreshed = new Date().toISOString();

  const flatten = (items: Item[]): Item[] =>
    items.flatMap((i) => [i, ...flatten(i.children ?? [])]);
  const workItems = flatten([
    ...w.pods.flatMap((p) => [
      { ...p.feature, children: p.workItems },
      ...(p.cm ? [p.cm] : []),
    ]),
    ...w.baseItems,
  ]);
  return {
    workspace: w,
    workItems,
    people,
    config: { delayMs: 350, failItemIds: [42032], failRefresh: false },
  };
}
