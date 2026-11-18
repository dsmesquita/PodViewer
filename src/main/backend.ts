import { shell } from "electron";
import type { TaskDraft, TaskResult } from "../shared/api";
import {
  reconcile,
  type Item,
  type Person,
  type Workspace,
} from "../shared/model";
import { actions } from "./actions";
import type { Connection } from "./connection";
import { tfsAuth } from "./credentials";
import { fetchBoard } from "./tfs";

/** Everything main needs from a work-item source: TFS in production, files in mock mode. */
export interface Backend {
  readonly kind: "tfs" | "mock";
  /** Returns the next workspace; the caller persists it. */
  refresh(workspace: Workspace): Promise<Workspace>;
  item(workspace: Workspace, id: number): Promise<Item>;
  people(workspace: Workspace, name: string): Promise<Person[]>;
  createTasks(
    workspace: Workspace,
    id: number,
    drafts: TaskDraft[],
  ): Promise<TaskResult[]>;
  open(url: string): Promise<void>;
}

export function createTfsBackend(connection: {
  get(): Connection;
  setVersion(version: string): Promise<void>;
}): Backend {
  const client = (workspace: Workspace) =>
    actions(workspace, tfsAuth(connection.get()));
  return {
    kind: "tfs",
    async refresh(workspace) {
      const auth = tfsAuth(connection.get());
      const result = await fetchBoard(workspace, auth);
      const next: Workspace = {
        ...reconcile(workspace, result.pods),
        diagnostics: result.diagnostics,
        availableFields: result.availableFields,
        lanes: result.lanes,
        baseLane: result.baseLane,
        areaPaths: result.areaPaths,
        areasInitialized: true,
        baseItems: result.baseItems,
      };
      const reader = actions(next, { ...auth, version: result.version });
      for (const id of next.manualIds) {
        try {
          const item = await reader.item(id);
          next.baseItems = [...next.baseItems.filter((x) => x.id !== id), item];
        } catch {
          /* Remain pinned for a later eligible refresh. */
        }
      }
      await connection.setVersion(result.version);
      return next;
    },
    item: (workspace, id) => client(workspace).item(id),
    people: (workspace, name) => client(workspace).people(name),
    createTasks: (workspace, id, drafts) =>
      client(workspace).create(id, drafts),
    async open(url) {
      await shell.openExternal(url);
    },
  };
}
