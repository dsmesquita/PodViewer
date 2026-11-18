import type { Workspace } from "../shared/model";
type Result<T> = { ok: true; value: T } | { ok: false; message: string };
declare global {
  interface Window {
    api?: {
      people(name: string): Promise<Result<import("../shared/model").Person[]>>;
      item(id: number): Promise<Result<import("../shared/model").Item>>;
      tasks(
        id: number,
        drafts: { title: string; assignedTo?: string; estimate: number }[],
      ): Promise<
        Result<
          {
            index: number;
            status: string;
            item?: import("../shared/model").Item;
            message?: string;
          }[]
        >
      >;
      load(): Promise<{ workspace: Workspace; mode: string; hasPat: boolean }>;
      save(w: Workspace): Promise<Result<Workspace>>;
      refresh(): Promise<Result<Workspace>>;
      auth(mode: string, token: string): Promise<Result<boolean>>;
      open(url: string): Promise<void>;
    };
  }
}
