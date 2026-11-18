import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { createHandlers, loadState, type Handlers } from "./src/main/handlers";
import { openMock } from "./src/main/mock/backend";
import { createJsonStore } from "./src/main/storage";

/**
 * Renderer-only dev server, for iterating on the UI in a plain browser without launching
 * Electron. `window.api` is served from the git-ignored mock/ folder through the same
 * handlers Electron uses, so pages behave as they do in `npm run dev:mock`.
 */
function mockApi(dir: string): Plugin {
  let handlers: Promise<Handlers> | undefined;
  const start = async () => {
    const mock = await openMock(dir);
    const store = createJsonStore(() => join(dir, ".profile"));
    const state = await loadState(store, mock.initialWorkspace);
    return createHandlers({
      state,
      store,
      backend: mock.backend,
      encryptPat: () => {
        throw Error("Tokens cannot be stored in the browser preview.");
      },
    });
  };
  return {
    name: "pod-viewer-mock-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__mock", (req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const method = (req.url ?? "").slice(1) as keyof Handlers;
            const api = await (handlers ??= start());
            // JSON-only POSTs force a CORS preflight, so other sites cannot call this.
            if (
              req.method !== "POST" ||
              !req.headers["content-type"]?.startsWith("application/json") ||
              !Object.hasOwn(api, method)
            )
              throw Error("Unknown mock method");
            const args: unknown = JSON.parse(body || "[]");
            const result = await api[method](
              ...(Array.isArray(args) ? args : []),
            );
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result ?? null));
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  plugins: [react(), mockApi(resolve(__dirname, "mock"))],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@": resolve(__dirname, "src/renderer/src"),
    },
  },
  server: { port: 5180 },
});
