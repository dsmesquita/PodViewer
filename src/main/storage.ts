import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface JsonStore {
  read(name: string): Promise<unknown>;
  write(name: string, value: unknown): Promise<void>;
}

/** Atomic JSON files under `root()`. Writes are serialized so a later save never lands first. */
export function createJsonStore(root: () => string): JsonStore {
  let writes = Promise.resolve();
  return {
    async read(name) {
      try {
        return JSON.parse(await readFile(join(root(), name), "utf8"));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        return undefined;
      }
    },
    write(name, value) {
      const next = writes.then(async () => {
        await mkdir(root(), { recursive: true });
        const file = join(root(), name);
        await writeFile(file + ".tmp", JSON.stringify(value, null, 2));
        await rename(file + ".tmp", file);
      });
      writes = next.catch(() => {});
      return next;
    },
  };
}
