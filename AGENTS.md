# Pod Viewer

Separate Windows Electron + React + TypeScript application. Task creation under a reviewed parent is the only authorized TFS write. Other operations remain read only. Never add work-item updates or deletions without an explicit user request.

`src/shared/model.ts` holds pure domain behavior; `src/main/tfs.ts` reads the board and linked CM POD records; main owns persistence, PAT encryption and external links. The renderer accesses them only through the typed preload bridge. Keep local overrides separate from source snapshots. Filtering must never release assignments or make conflicted people appear available.

Run `npm run check`, `npm run build`, then `node scripts/smoke.cjs` (use `xvfb-run -a` on headless Linux). Smoke tests launch the real Electron app with a disposable profile and a fake TFS server. `npm run dist` validates and packages for Windows. No live credentials belong in tests, source or logs.

Update README.md for changes in user-visible behavior. Source is independent of SprintViewer; don't modify that project as part of this app.

## Frontend conventions

Use shared Fluent-based controls from `ui/controls.tsx`; icons require accessible names and hover/focus tooltips. Keep text on navigation and consequential confirmations. Use 8px action gaps, 16px form-group spacing and 24px section spacing. Status icons expose concise tooltips and persistent details popovers; announce asynchronous results to assistive technology. Do not nest interactive controls. Work-item IDs open TFS, disclosure controls expand Tasks, and + opens a parent-bound task creation dialog. Features have workspaces; other work items remain inline. Do not duplicate active navigation labels as headings.

Pages belong in `pages/`, shared data/state behavior in `hooks/`, and reusable UI in `ui/`. Keep App as composition, not page implementation. Normalize TFS work items once at the read boundary and preserve cached data on retrieval errors.

References: https://fluent2.microsoft.design/components/web/react/core/toolbar/usage/ ; https://fluent2.microsoft.design/components/web/react/core/tooltip/usage/ ; https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
