import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("api", {
  people: (name: string) => ipcRenderer.invoke("people", name),
  item: (id: number) => ipcRenderer.invoke("item", id),
  tasks: (id: number, drafts: unknown) =>
    ipcRenderer.invoke("tasks", id, drafts),
  load: () => ipcRenderer.invoke("load"),
  save: (w: unknown) => ipcRenderer.invoke("save", w),
  refresh: () => ipcRenderer.invoke("refresh"),
  auth: (mode: string, token: string) =>
    ipcRenderer.invoke("auth", mode, token),
  open: (url: string) => ipcRenderer.invoke("open", url),
});
