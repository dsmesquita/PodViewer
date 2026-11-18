import { app, BrowserWindow, dialog, nativeTheme } from "electron";
import { join, resolve } from "node:path";
import { createTfsBackend, type Backend } from "./backend";
import { encryptPat } from "./credentials";
import { createHandlers, loadState, type MainState } from "./handlers";
import { registerIpc } from "./ipc";
import { createJsonStore } from "./storage";

app.setName("PodViewer");

/**
 * `npm run dev:mock` serves the git-ignored mock/ folder instead of TFS. The mode check is
 * statically false in production builds, and a packaged app never honours it.
 */
const mockDir =
  import.meta.env.MODE === "mock" && !app.isPackaged
    ? resolve(process.env.POD_VIEWER_MOCK_DIR || "mock")
    : undefined;
if (mockDir) app.setPath("userData", join(mockDir, ".profile"));

if (!app.requestSingleInstanceLock()) app.quit();

async function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1000,
    minHeight: 650,
    // Matches the Fluent theme background so launch does not flash.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#292929" : "#fafafa",
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
}

app.whenReady().then(async () => {
  const store = createJsonStore(() => app.getPath("userData"));
  let state: MainState;
  let backend: Backend;
  try {
    if (import.meta.env.MODE === "mock" && mockDir) {
      const { openMock } = await import("./mock/backend");
      const mock = await openMock(mockDir);
      backend = mock.backend;
      state = await loadState(store, mock.initialWorkspace);
    } else {
      state = await loadState(store);
      backend = createTfsBackend({
        get: () => state.connection,
        async setVersion(version) {
          state.connection = { ...state.connection, version };
          await store.write("connection.json", state.connection);
        },
      });
    }
  } catch (e) {
    dialog.showErrorBox("Pod Viewer data could not be loaded", String(e));
    app.quit();
    return;
  }
  registerIpc(createHandlers({ state, store, backend, encryptPat }));
  await createWindow();
});

app.on("window-all-closed", () => app.quit());
