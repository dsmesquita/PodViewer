import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TaskResult } from "../../shared/api";
import { reconcile, type Item, type Person, type Workspace } from "../../shared/model";
import { validateWorkspace } from "../../shared/validate";
import type { Backend } from "../backend";
import { mockSeed, type MockConfig, type MockData } from "./seed";

/**
 * Development-only stand-in for TFS, backed by the git-ignored mock/ folder. Seed files are
 * re-read on every call, so edits to them show up on the next Refresh. Nothing here touches
 * the network. Must not import electron: the browser mock server loads it too.
 */
const files = {
  workspace: "workspace.json",
  workItems: "work-items.json",
  people: "people.json",
  config: "config.json",
  readme: "README.md",
} as const;

const readme = `# Pod Viewer mock data

Local, git-ignored data for \`npm run dev:mock\` (Electron) and \`npm run dev:web\` (browser).
Nothing here is sent anywhere, and no TFS server is contacted.

| File | Purpose |
| --- | --- |
| workspace.json | The "TFS snapshot": pods, lanes, Base items, diagnostics, plus the starting roster and skills. Edit it, then press Refresh. |
| work-items.json | Work-item details by ID, including child Tasks, used when expanding items. |
| people.json | Identities returned by Settings → Search TFS. |
| config.json | \`delayMs\` slows every call, \`failItemIds\` makes those item reads fail, \`failRefresh\` makes Refresh fail. |
| .profile/ | The app's own saved state while running against this folder. |

Task drafts are "created" in memory only. Put \`[fail]\` or \`[uncertain]\` in a draft title to see those results.

\`npm run mock:reset\` deletes .profile (your local edits). \`npm run mock:reset -- --all\` deletes this whole folder, which is re-seeded on the next start.
`;

/** Writes any missing seed file. Existing files are never overwritten. */
export async function seedMock(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const seed = mockSeed();
  const contents: Record<string, string> = {
    [files.workspace]: JSON.stringify(seed.workspace, null, 2),
    [files.workItems]: JSON.stringify(seed.workItems, null, 2),
    [files.people]: JSON.stringify(seed.people, null, 2),
    [files.config]: JSON.stringify(seed.config, null, 2),
    [files.readme]: readme,
  };
  for (const [name, text] of Object.entries(contents))
    await writeFile(join(dir, name), text, { flag: "wx" }).catch((e) => {
      if (e.code !== "EEXIST") throw e;
    });
}

async function readMock(dir: string): Promise<MockData> {
  const read = async (name: string) =>
    JSON.parse(await readFile(join(dir, name), "utf8"));
  const config: Partial<MockConfig> = await read(files.config).catch(() => ({}));
  return {
    workspace: validateWorkspace(await read(files.workspace)),
    workItems: await read(files.workItems).catch(() => []),
    people: await read(files.people).catch(() => []),
    config: {
      delayMs: Number(config.delayMs) || 0,
      failItemIds: Array.isArray(config.failItemIds) ? config.failItemIds : [],
      failRefresh: config.failRefresh === true,
    },
  };
}

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function createMockBackend(dir: string): Backend {
  /** Tasks "created" during this session, keyed by parent ID. */
  const created = new Map<number, Item[]>();
  let nextId = 99000;
  const delayed = async () => {
    const data = await readMock(dir);
    if (data.config.delayMs)
      await new Promise((r) => setTimeout(r, data.config.delayMs));
    return data;
  };
  const find = (items: Item[], id: number): Item | undefined => {
    for (const entry of items) {
      if (entry.id === id) return entry;
      const child = find(entry.children ?? [], id);
      if (child) return child;
    }
  };
  return {
    kind: "mock",
    async refresh(current) {
      const { workspace: seed, config } = await delayed();
      if (config.failRefresh)
        throw Error(
          "Mock TFS is unreachable (failRefresh is true in mock/config.json).",
        );
      const manual = current.baseItems.filter((i) =>
        current.manualIds.includes(i.id),
      );
      return {
        ...reconcile(current, seed.pods),
        lanes: seed.lanes,
        baseLane: current.baseLane || seed.baseLane,
        diagnostics: seed.diagnostics,
        availableFields: seed.availableFields,
        areasInitialized: true,
        baseItems: [
          ...seed.baseItems.filter((i) => !manual.some((m) => m.id === i.id)),
          ...manual,
        ],
      };
    },
    async item(_, id) {
      const { workItems, workspace, config } = await delayed();
      if (config.failItemIds.includes(id))
        throw Error(`TFS 503: mock failure for #${id} (see mock/config.json)`);
      const found =
        find(workItems, id) ??
        find(
          workspace.pods.flatMap((p) => [p.feature, ...p.workItems]),
          id,
        ) ??
        find(workspace.baseItems, id) ??
        find([...created.values()].flat(), id);
      if (!found) throw Error(`TFS 404: work item #${id} does not exist`);
      const children = (found.children ?? []).map((child) => ({
        ...(find(workItems, child.id) ?? child),
        parentId: id,
      }));
      return {
        ...found,
        children: [...children, ...(created.get(id) ?? [])],
      };
    },
    async people(_, name) {
      const { people } = await delayed();
      const query = fold(name.trim());
      return people.filter((p: Person) =>
        fold(`${p.name} ${p.account ?? ""}`).includes(query),
      );
    },
    async createTasks(workspace, id, drafts) {
      const { people, workItems } = await delayed();
      const parent = find(workItems, id);
      const results: TaskResult[] = [];
      for (const [index, draft] of drafts.entries()) {
        if (/\[fail\]/i.test(draft.title)) {
          results.push({ index, status: "failed", message: "TFS 400: mock rejection" });
          continue;
        }
        if (/\[uncertain\]/i.test(draft.title)) {
          results.push({ index, status: "uncertain", message: "Mock timeout" });
          continue;
        }
        const owner =
          people.find((p: Person) => p.account === draft.assignedTo) ??
          workspace.roster.find((p) => p.account === draft.assignedTo);
        const task: Item = {
          id: nextId++,
          type: "Task",
          title: draft.title.trim(),
          state: "New",
          url: (parent?.url ?? "https://tfs.example.invalid/_workitems/edit/0").replace(
            /\d+$/,
            String(nextId - 1),
          ),
          parentId: id,
          areaPath: parent?.areaPath,
          iterationPath: parent?.iterationPath,
          assignedTo: draft.assignedTo,
          assigneeName: owner?.name,
        };
        created.set(id, [...(created.get(id) ?? []), task]);
        results.push({ index, status: "created", item: task });
      }
      return results;
    },
    async open(url) {
      console.info(`[mock] Not opening ${url}; mock URLs do not resolve.`);
    },
  };
}

/** Seeds the folder if needed and returns the backend plus the first-run workspace. */
export async function openMock(dir: string) {
  await seedMock(dir);
  return {
    backend: createMockBackend(dir),
    initialWorkspace: async (): Promise<Workspace> =>
      (await readMock(dir)).workspace,
  };
}
