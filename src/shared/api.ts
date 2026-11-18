import type { Item, Person, Workspace } from "./model";

/** The typed contract between the renderer and main, shared by preload, main and mocks. */
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export type AuthMode = "windows" | "pat";

/** "mock" is reported only by the development mock backend. */
export type ConnectionMode = AuthMode | "mock";

export interface TaskDraft {
  title: string;
  assignedTo?: string;
  estimate: number;
}

export type TaskStatus = "created" | "failed" | "uncertain";

export interface TaskResult {
  index: number;
  status: TaskStatus;
  item?: Item;
  message?: string;
}

export interface LoadResult {
  workspace: Workspace;
  mode: ConnectionMode;
  hasPat: boolean;
}

export interface PodViewerApi {
  load(): Promise<LoadResult>;
  save(workspace: Workspace): Promise<Result<Workspace>>;
  refresh(): Promise<Result<Workspace>>;
  auth(mode: AuthMode, token: string): Promise<Result<boolean>>;
  people(name: string): Promise<Result<Person[]>>;
  item(id: number): Promise<Result<Item>>;
  tasks(id: number, drafts: TaskDraft[]): Promise<Result<TaskResult[]>>;
  open(url: string): Promise<void>;
}

export const IpcChannel = {
  load: "load",
  save: "save",
  refresh: "refresh",
  auth: "auth",
  people: "people",
  item: "item",
  tasks: "tasks",
  open: "open",
} as const satisfies Record<keyof PodViewerApi, string>;

export const isTaskDraft = (value: unknown): value is TaskDraft => {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.title === "string" &&
    !!draft.title.trim() &&
    typeof draft.estimate === "number" &&
    Number.isFinite(draft.estimate) &&
    draft.estimate >= 0 &&
    (draft.assignedTo === undefined || typeof draft.assignedTo === "string")
  );
};
