# Pod Viewer

A local Windows desktop workspace for one domain: Features become temporary pods, with a Base roster, timeline and skills matrix. Task creation is the only TFS write.

## Run

The finished Windows installer in `release/` includes its runtime; Node.js is needed only to build or run from source.

Install Node.js 22 or newer, then run `npm install` and `npm run dev`.

`npm run dev:web` opens the renderer at http://localhost:5180. Choose **Load sample data** to explore without TFS. Browser preview cannot connect to TFS or save to disk.

`npm run check` runs type checks and tests. `npm run build` builds the Electron app. `npm run dist` validates, builds and packages a per-user Windows installer under `release/` (requires Windows for packaging).

## Connect

Open Settings, paste the Features board URL, choose Windows integrated authentication or a PAT with Work Items (Read), then Save connection & refresh. Your machine must reach the internal TFS server, usually through the corporate network/VPN. The OS must trust its HTTPS certificate.

Named board swimlanes define pods; Base and the unnamed default lane are excluded. A lane must have one Feature. Features link to CM POD work items, which supply Assigned To, Pod Member fields, Created Date and Planned Close Date. Stories are fetched across iterations. If field discovery cannot identify your custom fields, use Settings to map them. Multiple CM POD links or multiple Features require correction in TFS; diagnostics explain these cases.

Select CM Pod owners in Settings. Renato Ribeiro is selected automatically when a unique matching identity is discovered. No selected owners means everyone. Filters never release members from their assignments. A missing CM POD cannot match a selected owner.

Add the complete domain roster manually in Settings. Map each person's TFS account (DOMAIN\user or email) to match imported pod membership. Unmatched people remain visible in pod details. Base contains only roster members with no open pod. Imported duplicate assignments are flagged; Move here resolves them.

Click a pod to rename it locally, override members or dates, see stories, and navigate to TFS. Use TFS members/expected finish to clear overrides. Changing local members creates an override for the whole list. Close a pod to return its members to Base. Resolved/Closed Features prompt for confirmation; Not yet leaves the closure action available.

The initial import starts current pods on 16 November 2026. Later discoveries use CM POD creation dates. Missing dates require entry before a pod appears on the timeline. Solid bars show elapsed time; dashed bars show expected duration. Show past pods reveals closed records. Dates use Europe/Lisbon.

## Storage and security

Data is stored in `%APPDATA%\PodViewer`: `workspace.json` contains source snapshots, local overrides, roster, skills and recorded membership changes; `connection.json` contains connection preferences and a DPAPI-encrypted PAT. Tokens never return to the renderer. Back up the folder while the app is closed. Encrypted credentials are tied to your Windows account and machine.

The last successful snapshot remains available offline. Disappearing pods are flagged, not deleted. Changing the board URL should be done only for the same domain; use a separate backed-up workspace for another domain.

Future assignments, shared editing, automatic recommendations and historical TFS reconstruction are outside this version. Live server compatibility requires checking your actual CM POD links and custom fields after connecting.

The real Electron integration check is `npm run test:e2e`; on a headless Linux host use `npm run build` followed by `xvfb-run -a node scripts/smoke.cjs`. It uses a disposable data folder and a fake TFS server, never your production workspace. The default owner selection stays pending until Renato's identity resolves or you explicitly choose owners/clear the filter.

## Version 0.2

Use the top navigation to open Base and Skills. Click an Overview pod card to open its page. Use its side-panel icon to preview the pod. Timeline supports single-click preview and double-click page navigation. Full screen fills the app; Escape restores navigation. Content scrolls below the fixed top bar.

Settings defines Area Paths (including descendants), seeded from the board team on first connection after upgrade. Every displayed work item must match these paths. Base shows unfinished Features without an active pod and supports manual IDs under the same rules. Existing assignments are retained when filters hide a pod.

Use Search name or Find username to resolve people, or Resolve names for unmapped roster entries. Identity lookup requires Identity Read permissions. Ambiguous names require selection; manual account entry remains available.

Open work-item details to load children or Create tasks. Templates are prefix groups managed in Settings, defaulting to BUILD + VAL. Review task titles, assignees and estimates before submission. Area, iteration and tags inherit from the freshly read parent. Tasks require Work Items Read & Write permissions. Successful rows are removed from retry; uncertain results require checking TFS before recreating a task.

Version 1 workspace data migrates to version 2, preserving roster IDs, skills, local overrides and credentials.

## Version 0.3

Pod headers show their single Feature. Bugs and User Stories expand inline to Task rows; linked IDs open TFS. Use the + icon on a work-item header to open the task-creation dialog. Base Features open Feature workspaces, while manually selected Bugs/User Stories expand directly. Routine controls use icons with keyboard-accessible tooltips. Status icons reveal explanations on hover/focus and persistent details on click. Main-tab headings are no longer repeated above the content. Workspace version 3 migrates existing stories into the generic work-item collection without changing IDs, local overrides, skills or history.

## Version 0.4

A Pod page opens on **Members**. Each card lists work assigned to that member, including Tasks assigned separately from their parent. **Work Items** shows the hierarchy and includes unassigned work. Type badges identify Epics (orange), Features (purple), Bugs (red), User Stories (blue), Tasks (yellow), and Pods (green). Task rows link to TFS without expanding.

Use the collapsed membership panel to review the roster and its **Add members** button to add or transfer people. Settings → **Team Members** has an **Add member** dialog with TFS identity search and manual entry.

In **Skills**, the **Members** tab shows each person's ratings and opens their skills editor. Use the **Skills** tab to manage the catalog. All skills use Learning (red), Working (yellow), and Experienced (green). Existing Expert ratings appear as Experienced.

Change dialogs use **Save** and **Cancel**. Task creation shows a result for each draft and offers **Close** once no drafts remain. Check uncertain results in TFS before attempting them again.
