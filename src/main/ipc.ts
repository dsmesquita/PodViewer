import { ipcMain } from "electron";
import { IpcChannel } from "../shared/api";
import type { Handlers } from "./handlers";

export function registerIpc(handlers: Handlers) {
  for (const [name, channel] of Object.entries(IpcChannel))
    ipcMain.handle(channel, (_, ...args: unknown[]) =>
      handlers[name as keyof Handlers](...args),
    );
}
