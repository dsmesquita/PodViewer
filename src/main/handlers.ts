import {
  isTaskDraft,
  type LoadResult,
  type PodViewerApi,
  type Result,
} from "../shared/api";
import { emptyWorkspace, type Workspace } from "../shared/model";
import { validateWorkspace } from "../shared/validate";
import type { Backend } from "./backend";
import { readConnection, type Connection } from "./connection";
import type { JsonStore } from "./storage";

/**
 * Transport-agnostic API handlers. Electron registers them on ipcMain; the browser mock
 * server calls them over HTTP. Every argument comes from the renderer and is validated.
 * This module must not import electron so the Vite dev server can load it.
 */
export interface MainState {
  workspace: Workspace;
  connection: Connection;
}

export type Handlers = {
  [K in keyof PodViewerApi]: (...args: unknown[]) => Promise<unknown>;
};

const safe = <T>(fn: () => Promise<T>): Promise<Result<T>> =>
  fn()
    .then((value) => ({ ok: true as const, value }))
    .catch((e) => ({ ok: false as const, message: String(e?.message || e) }));

const workItemId = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw Error("Enter a positive work-item ID");
  return value;
};

export async function loadState(
  store: JsonStore,
  initial: () => Workspace | Promise<Workspace> = emptyWorkspace,
): Promise<MainState> {
  return {
    workspace: validateWorkspace(
      (await store.read("workspace.json")) ?? (await initial()),
    ),
    connection: readConnection(await store.read("connection.json")),
  };
}

export function createHandlers({
  state,
  store,
  backend,
  encryptPat,
}: {
  state: MainState;
  store: JsonStore;
  backend: Backend;
  encryptPat: (token: string) => string;
}): Handlers {
  return {
    async load(): Promise<LoadResult> {
      return {
        workspace: state.workspace,
        mode: backend.kind === "mock" ? "mock" : state.connection.mode,
        hasPat: !!state.connection.cipher,
      };
    },
    save: (data) =>
      safe(async () => {
        const next = validateWorkspace(data);
        await store.write("workspace.json", next);
        state.workspace = next;
        return next;
      }),
    auth: (mode, token) =>
      safe(async () => {
        if (mode !== "windows" && mode !== "pat")
          throw Error("Invalid authentication");
        if (typeof token !== "string") throw Error("Invalid token");
        const next: Connection = {
          ...state.connection,
          mode,
          cipher: token ? encryptPat(token) : state.connection.cipher,
        };
        await store.write("connection.json", next);
        state.connection = next;
        return true;
      }),
    refresh: () =>
      safe(async () => {
        const next = await backend.refresh(state.workspace);
        await store.write("workspace.json", next);
        state.workspace = next;
        return next;
      }),
    people: (name) =>
      safe(async () => {
        if (typeof name !== "string" || name.trim().length < 2)
          throw Error("Enter at least two characters");
        return backend.people(state.workspace, name);
      }),
    item: (id) => safe(() => backend.item(state.workspace, workItemId(id))),
    tasks: (id, drafts) =>
      safe(async () => {
        if (
          !Array.isArray(drafts) ||
          !drafts.length ||
          drafts.length > 100 ||
          !drafts.every(isTaskDraft)
        )
          throw Error("Invalid task drafts");
        return backend.createTasks(state.workspace, workItemId(id), drafts);
      }),
    async open(value) {
      if (typeof value !== "string") return;
      const url = new URL(value);
      if (["https:", "http:"].includes(url.protocol))
        await backend.open(url.href);
    },
  };
}
