import { IpcChannel, type PodViewerApi } from "@shared/api";

/**
 * Browser preview only (`npm run dev:web`): routes `window.api` to the Vite mock server,
 * which serves the git-ignored mock/ folder. Never bundled into the Electron app.
 */
export function installMockApi() {
  const call =
    (method: string) =>
    async (...args: unknown[]) => {
      const response = await fetch(`/__mock/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!response.ok) throw Error(await response.text());
      return response.json();
    };
  window.api = Object.fromEntries(
    Object.keys(IpcChannel).map((method) => [method, call(method)]),
  ) as unknown as PodViewerApi;
}
