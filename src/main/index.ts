import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  shell,
  dialog,
} from "electron";
import { join } from "node:path";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { emptyWorkspace, reconcile } from "../shared/model";
import { validateWorkspace as validate } from "../shared/validate";
import { actions } from "./actions";
import { fetchBoard } from "./tfs";
let auth = { mode: "windows", cipher: "", version: "" };
let workspace = emptyWorkspace();
const root = () => app.getPath("userData");
let writes = Promise.resolve();
function save(name: string, value: unknown): Promise<void> {
  const next = writes.then(async () => {
    await mkdir(root(), { recursive: true });
    const file = join(root(), name);
    await writeFile(file + ".tmp", JSON.stringify(value, null, 2));
    await rename(file + ".tmp", file);
  });
  writes = next.catch(() => {});
  return next;
}
async function load(name: string): Promise<any> {
  try {
    return JSON.parse(await readFile(join(root(), name), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return undefined;
  }
}
app.setName("PodViewer");
if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(async () => {
  try {
    workspace = validate((await load("workspace.json")) || emptyWorkspace());
    auth = (await load("connection.json")) || auth;
  } catch (e) {
    dialog.showErrorBox("Pod Viewer data could not be loaded", String(e));
    app.quit();
    return;
  }
  const safe = <T>(fn: () => Promise<T>) =>
    fn()
      .then((value) => ({ ok: true, value }))
      .catch((e) => ({ ok: false, message: String(e.message || e) }));
  ipcMain.handle("load", () => ({
    workspace,
    mode: auth.mode,
    hasPat: !!auth.cipher,
  }));
  ipcMain.handle("save", (_, data: unknown) =>
    safe(async () => {
      const next = validate(data);
      await save("workspace.json", next);
      workspace = next;
      return workspace;
    }),
  );
  ipcMain.handle("auth", (_, mode: unknown, token: unknown) =>
    safe(async () => {
      if (mode !== "windows" && mode !== "pat")
        throw Error("Invalid authentication");
      if (typeof token !== "string") throw Error("Invalid token");
      if (token && !safeStorage.isEncryptionAvailable())
        throw Error("Windows encryption is unavailable");
      const next = {
        ...auth,
        mode,
        cipher: token
          ? safeStorage.encryptString(token).toString("base64")
          : auth.cipher,
      };
      await save("connection.json", next);
      auth = next;
      return true;
    }),
  );
  ipcMain.handle("refresh", () =>
    safe(async () => {
      const result = await fetchBoard(workspace, {
        mode: auth.mode,
        version: auth.version,
        pat: auth.cipher
          ? safeStorage.decryptString(Buffer.from(auth.cipher, "base64"))
          : undefined,
      });
      const next = {
        ...reconcile(workspace, result.pods),
        diagnostics: result.diagnostics,
        availableFields: result.availableFields,
        lanes: result.lanes,
        baseLane: result.baseLane,
        areaPaths: result.areaPaths,
        areasInitialized: true,
        baseItems: result.baseItems,
      };
      for (const id of next.manualIds) {
        try {
          const item = await actions(next, {
            mode: auth.mode,
            version: result.version,
            pat: auth.cipher
              ? safeStorage.decryptString(Buffer.from(auth.cipher, "base64"))
              : undefined,
          }).item(id);
          next.baseItems = [...next.baseItems.filter((x) => x.id !== id), item];
        } catch {
          /* Remain pinned for a later eligible refresh. */
        }
      }
      await save("workspace.json", next);
      workspace = next;
      auth.version = result.version;
      await save("connection.json", auth);
      return next;
    }),
  );
  const client = () =>
    actions(workspace, {
      mode: auth.mode,
      version: auth.version,
      pat: auth.cipher
        ? safeStorage.decryptString(Buffer.from(auth.cipher, "base64"))
        : undefined,
    });
  ipcMain.handle("people", (_, name: string) =>
    safe(() => client().people(name)),
  );
  ipcMain.handle("item", (_, id: number) => safe(() => client().item(id)));
  ipcMain.handle(
    "tasks",
    (_, id: number, drafts: import("./actions").Draft[]) =>
      safe(() => client().create(id, drafts)),
  );
  ipcMain.handle("open", async (_, value: unknown) => {
    if (typeof value !== "string") return;
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol))
      await shell.openExternal(url.href);
  });
  const win = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: "#101820",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  if (process.env.ELECTRON_RENDERER_URL)
    await win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else await win.loadFile(join(__dirname, "../renderer/index.html"));
});
app.on("window-all-closed", () => app.quit());
