import type { AuthMode } from "../shared/api";

/** Persisted as connection.json. The PAT is DPAPI-encrypted and never leaves main. */
export interface Connection {
  mode: AuthMode;
  cipher: string;
  version: string;
}

export function readConnection(value: unknown): Connection {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<
    Record<keyof Connection, unknown>
  >;
  return {
    mode: raw.mode === "pat" ? "pat" : "windows",
    cipher: typeof raw.cipher === "string" ? raw.cipher : "",
    version: typeof raw.version === "string" ? raw.version : "",
  };
}
