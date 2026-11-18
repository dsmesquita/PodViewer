import { safeStorage } from "electron";
import type { Connection } from "./connection";

export function encryptPat(token: string): string {
  if (!safeStorage.isEncryptionAvailable())
    throw Error("Windows encryption is unavailable");
  return safeStorage.encryptString(token).toString("base64");
}

export function tfsAuth(connection: Connection) {
  return {
    mode: connection.mode,
    version: connection.version,
    pat: connection.cipher
      ? safeStorage.decryptString(Buffer.from(connection.cipher, "base64"))
      : undefined,
  };
}
