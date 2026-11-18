import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type PodViewerApi } from "../shared/api";

const api = {
  load: () => ipcRenderer.invoke(IpcChannel.load),
  save: (workspace) => ipcRenderer.invoke(IpcChannel.save, workspace),
  refresh: () => ipcRenderer.invoke(IpcChannel.refresh),
  auth: (mode, token) => ipcRenderer.invoke(IpcChannel.auth, mode, token),
  people: (name) => ipcRenderer.invoke(IpcChannel.people, name),
  item: (id) => ipcRenderer.invoke(IpcChannel.item, id),
  tasks: (id, drafts) => ipcRenderer.invoke(IpcChannel.tasks, id, drafts),
  open: (url) => ipcRenderer.invoke(IpcChannel.open, url),
} satisfies PodViewerApi;

contextBridge.exposeInMainWorld("api", api);
