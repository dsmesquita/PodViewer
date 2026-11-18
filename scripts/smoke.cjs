const { _electron: electron } = require("playwright");
const { mkdtemp, writeFile, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
(async () => {
  const dir = await mkdtemp(join(tmpdir(), "pod-viewer-e2e-"));
  let app;
  let port;
  const requests = [];
  let taskWrites = 0;
  const created = new Map();
  const server = http.createServer((req, res) => {
    requests.push([req.method, req.url]);
    let value;
    const base = `http://127.0.0.1:${port}/Products/Product/_apis/wit/workitems/`;
    if (req.method === "POST" && req.url.includes("/workitems/$Task")) {
      taskWrites++;
      if (taskWrites === 2) {
        res.writeHead(400);
        res.end("Fixture rejection");
        return;
      }
      value = {
        id:
          50 +
          requests.filter(
            ([method, url]) =>
              method === "POST" && url.includes("/workitems/$Task"),
          ).length,
        fields: {
          "System.Title": "Created task",
          "System.State": "New",
          "System.WorkItemType": "Task",
          "System.AreaPath": "Product",
          "System.IterationPath": "Product\\Sprint",
        },
      };
      created.set(value.id, value);
    } else if (
      [...created.keys()].some((id) =>
        req.url.includes("/workitems/" + id + "?"),
      )
    ) {
      value = created.get(Number(req.url.match(/workitems\/(\d+)/)[1]));
    } else if (req.url.includes("/workitems/10?")) {
      value = {
        id: 10,
        fields: {
          "System.Title": "Fixture feature",
          "System.State": "Active",
          "System.WorkItemType": "Feature",
          "System.AreaPath": "Product",
          "System.IterationPath": "Product\\Sprint",
          "System.Tags": "Test",
        },
        relations: [30, ...created.keys()].map((id) => ({
          rel: "System.LinkTypes.Hierarchy-Forward",
          url: base + id,
        })),
      };
    } else if (req.url.includes("/workitems/30?"))
      value = {
        id: 30,
        fields: {
          "System.Title": "Fixture story",
          "System.State": "Active",
          "System.WorkItemType": "Bug",
          "System.AreaPath": "Product",
          "System.AssignedTo": {
            id: "ana",
            displayName: "Ana",
            uniqueName: "DOMAIN\\ana",
          },
        },
        relations: [
          { rel: "System.LinkTypes.Hierarchy-Forward", url: base + "31" },
        ],
      };
    else if (req.url.includes("/workitems/31?"))
      value = {
        id: 31,
        fields: {
          "System.Title": "Fixture task",
          "System.State": "New",
          "System.WorkItemType": "Task",
          "System.AreaPath": "Product",
          "System.AssignedTo": {
            id: "miguel",
            displayName: "Miguel",
            uniqueName: "DOMAIN\\miguel",
          },
        },
      };
    else if (req.url.includes("/identities?"))
      value = {
        value: [
          {
            id: "miguel",
            providerDisplayName: "Miguel",
            isActive: true,
            properties: {
              Domain: { $value: "DOMAIN" },
              Account: { $value: "miguel" },
            },
          },
        ],
      };
    else if (req.url.includes("/workitems/11?"))
      value = {
        id: 11,
        fields: {
          "System.Title": "Second feature",
          "System.WorkItemType": "Feature",
          "System.State": "Active",
          "System.AreaPath": "Product",
        },
      };
    else if (req.url.includes("/boards/"))
      value = {
        id: "board",
        rows: [
          { id: "pod", name: "Pod One" },
          { id: "second", name: "Pod Two" },
          { id: "base", name: "Base Lane" },
        ],
        fields: {
          "System.AreaPath": "Product",
          rowField: { referenceName: "WEF.Row" },
          columnField: { referenceName: "WEF.Column" },
        },
      };
    else if (req.url.includes("teamfieldvalues"))
      value = {
        field: { referenceName: "System.AreaPath" },
        values: [{ value: "Product", includeChildren: true }],
      };
    else if (req.url.includes("/wiql"))
      value = { workItems: [{ id: 10 }, { id: 11 }] };
    else if (req.url.includes("/workitems?"))
      value = {
        value: req.url.includes("ids=10")
          ? [
              {
                id: 10,
                fields: {
                  "System.AreaPath": "Product",
                  "System.Title": "Fixture feature",
                  "System.State": "Active",
                  "System.WorkItemType": "Feature",
                  "WEF.Row": "Pod One",
                  "WEF.Column": "Doing",
                },
                relations: [
                  { rel: "System.LinkTypes.Related", url: base + "20" },
                  {
                    rel: "System.LinkTypes.Hierarchy-Forward",
                    url: base + "30",
                  },
                ],
              },
              {
                id: 11,
                fields: {
                  "System.Title": "Second feature",
                  "System.WorkItemType": "Feature",
                  "System.State": "Active",
                  "System.AreaPath": "Product",
                  "WEF.Row": "Pod Two",
                },
                relations: [
                  { rel: "System.LinkTypes.Related", url: base + "21" },
                ],
              },
            ]
          : [
              {
                id: 20,
                fields: {
                  "System.AreaPath": "Product",
                  "System.Title": "Fixture CM Pod",
                  "System.State": "New",
                  "System.WorkItemType": "CM POD",
                  "System.AssignedTo": {
                    id: "leader",
                    displayName: "Renato Ribeiro",
                  },
                  "Custom.Member1": {
                    id: "ana",
                    displayName: "Ana",
                    uniqueName: "DOMAIN\\ana",
                  },
                  "System.CreatedDate": "2026-11-16T12:00:00Z",
                },
              },
              {
                id: 21,
                fields: {
                  "System.Title": "Second pod",
                  "System.WorkItemType": "CM POD",
                  "System.AreaPath": "Product",
                  "System.State": "Active",
                  "System.AssignedTo": {
                    id: "leader",
                    displayName: "Renato Ribeiro",
                  },
                  "Custom.Member1": {
                    id: "miguel",
                    displayName: "Miguel",
                    uniqueName: "DOMAIN\\miguel",
                  },
                  "System.CreatedDate": "2026-11-16T12:00:00Z",
                },
              },
              {
                id: 30,
                fields: {
                  "System.AreaPath": "Product",
                  "System.Title": "Fixture story",
                  "System.State": "Active",
                  "System.WorkItemType": "Bug",
                  "System.AssignedTo": {
                    id: "ana",
                    displayName: "Ana",
                    uniqueName: "DOMAIN\\ana",
                  },
                },
              },
            ],
      };
    else if (req.url.includes("/fields"))
      value = {
        value: [{ name: "Pod Member 1", referenceName: "Custom.Member1" }],
      };
    else if (req.url.includes("workitemtypes"))
      value = { value: [{ name: "CM POD" }] };
    else {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(value));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
  try {
    async function launch() {
      app = await electron.launch({
        args: [
          "--no-sandbox",
          "--user-data-dir=" + dir,
          resolve("out/main/index.js"),
        ],
        env: { ...process.env, ELECTRON_DISABLE_SANDBOX: "1" },
      });
      return app.firstWindow();
    }
    let page = await launch();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByLabel("Features board URL")
      .fill(
        `http://127.0.0.1:${port}/Products/Product/_boards/board/t/Domain/Features`,
      );
    await page
      .getByRole("button", { name: "Save connection & refresh" })
      .click();
    await page.getByText("Renato Ribeiro", { exact: true }).waitFor();
    const button = (name) => page.getByRole("button", { name, exact: true });
    const dialog = () => page.getByRole("dialog").last();
    const inDialog = (name) =>
      dialog().getByRole("button", { name, exact: true });
    const memberCard = (name) =>
      page
        .locator(".member-card")
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await button("Add member").click();
    await dialog().getByLabel("Full name").fill("Ana");
    await dialog().getByLabel("TFS account (optional)").fill("DOMAIN\\ana");
    await inDialog("Save").click();
    await button("Add member").click();
    await dialog().getByLabel("Search TFS by name or account").fill("Miguel");
    await inDialog("Search TFS").click();
    await inDialog("Miguel · DOMAIN\\miguel").click();
    await inDialog("Save").click();
    await button("Overview").click();
    await button("Open pod details for Pod One").click();
    await page.getByRole("dialog", { name: "Pod details" }).waitFor();
    assert(!page.url().includes("#pod/"));
    await button("Close").click();
    await page
      .locator(".pod-card .eyebrow")
      .getByText("Pod One", { exact: true })
      .click();
    await page.waitForFunction(() => location.hash.startsWith("#pod/"));
    assert.equal(await page.getByLabel("Show past pods").count(), 0);
    assert.equal(
      await page.getByRole("tab", { name: "Members", selected: true }).count(),
      1,
    );
    assert.equal(
      await button("Pod membership").getAttribute("aria-expanded"),
      "false",
    );
    await memberCard("Ana")
      .getByText("Fixture story", { exact: true })
      .waitFor();
    assert.equal(await memberCard("Miguel").count(), 0);
    await button("Add members").click();
    await dialog()
      .getByLabel(/Miguel/)
      .check();
    await inDialog("Cancel").click();
    assert.equal(await memberCard("Miguel").count(), 0);
    await button("Add members").click();
    await dialog()
      .getByLabel(/Miguel/)
      .check();
    await inDialog("Save").click();
    await memberCard("Miguel")
      .getByText("Fixture task", { exact: true })
      .waitFor();
    assert.equal(
      await memberCard("Ana")
        .getByText("Fixture task", { exact: true })
        .count(),
      0,
    );
    await page.getByRole("tab", { name: "Work Items" }).click();
    await button("Expand Tasks").click();
    await page.getByText("Fixture task", { exact: true }).waitFor();
    const task = page.locator(".task-row").filter({ hasText: "Fixture task" });
    assert.equal(await task.getByRole("button").count(), 0);
    assert.equal(await task.locator(".type-task").innerText(), "Task");

    await app.evaluate(({ shell }) => {
      shell.openExternal = async (url) => {
        globalThis.__lastOpened = url;
      };
    });
    await page.getByRole("link", { name: "#10", exact: true }).click();
    assert(
      (await app.evaluate(() => globalThis.__lastOpened)).endsWith(
        "/_workitems/edit/10",
      ),
    );
    await page
      .getByRole("button", { name: "Create tasks for #10", exact: true })
      .click();
    await page
      .getByRole("button", { name: "BUILD + VAL", exact: true })
      .click();
    await inDialog("Save").click();
    await page
      .getByRole("status")
      .filter({ hasText: "Row 1: created" })
      .waitFor();
    assert.equal(
      await dialog().getByLabel("Task title 1").inputValue(),
      "VAL:: Fixture feature",
    );
    assert.equal(await dialog().getByLabel("Task title 2").count(), 0);
    await inDialog("Save").click();
    await inDialog("Close").click();
    assert.equal(taskWrites, 3);
    await page.getByRole("link", { name: "#51", exact: true }).waitFor();
    await page.getByRole("link", { name: "#53", exact: true }).waitFor();
    await page.getByLabel("Pod name").fill("Local pod name");
    await button("Overview").click();
    await page.getByText("Local pod name", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await page.locator(".timeline").waitFor();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.locator("textarea").fill("Product\nProduct\\Other");
    await page.locator("textarea").press("Tab");
    assert((await page.locator("textarea").inputValue()).includes("\n"));
    await page.getByRole("button", { name: "Skills", exact: true }).click();
    await page.getByRole("tab", { name: "Skills", exact: true }).click();
    await button("Add skill").click();
    await dialog().getByLabel("Skill name").fill("Validation");
    await inDialog("Save").click();
    await page.getByRole("tab", { name: "Members", exact: true }).click();
    await button("Manage skills for Ana").click();
    await dialog().getByLabel("Validation").selectOption("4");
    await inDialog("Cancel").click();
    assert.equal(
      await memberCard("Ana")
        .getByText(/Validation/)
        .count(),
      0,
    );
    await button("Manage skills for Ana").click();
    await dialog().getByLabel("Validation").selectOption("4");
    await inDialog("Save").click();
    await memberCard("Ana")
      .locator(".level-4")
      .filter({ hasText: "Validation" })
      .waitFor();
    await page
      .getByRole("button", { name: "Base", exact: true })
      .first()
      .click();
    await page
      .getByRole("heading", {
        name: "Unassigned Features & work items",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Full screen", exact: true })
      .first()
      .click();
    assert(await page.locator("header").isHidden());
    await page.keyboard.press("Escape");
    assert(await page.locator("header").isVisible());
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await button("Fixture feature").press("Enter");
    await page.waitForFunction(() => location.hash.startsWith("#pod/"));
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    assert.equal(errors.length, 0);
    await page.waitForTimeout(300);
    await app.close();
    app = null;
    const saved = JSON.parse(
      await readFile(join(dir, "workspace.json"), "utf8"),
    );
    assert.equal(saved.overrides["board:cm20"].name, "Local pod name");
    assert.equal(saved.roster.length, 2);
    assert.equal(saved.levels[saved.roster[0].id].Validation, 4);
    assert.equal(saved.overrides["board:cm20"].members.length, 2);
    assert.deepEqual(saved.overrides["board:cm21"].members, []);
    assert(
      requests.every(
        ([method, url]) =>
          method === "GET" ||
          (method === "POST" &&
            (url.includes("/wiql") || url.includes("/workitems/$Task"))),
      ),
    );
    await new Promise((r) => server.close(r));
    page = await launch();
    await page.getByText("Local pod name", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "View status details", exact: true })
      .first()
      .click();
    await page
      .locator(".status-details")
      .filter({ hasText: /fetch|ERR|connect|reach/i })
      .waitFor();
    await page.getByText("Local pod name", { exact: true }).click();
    await page
      .getByRole("button", { name: "Close pod & return members to Base" })
      .click();
    await page.getByLabel("Actual closure date").fill("2026-11-17");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Closed 2026-11-17", { exact: true }).waitFor();
    await button("Overview").click();
    await page.getByLabel("Show past pods").check();
    await page.getByText("Local pod name", { exact: true }).waitFor();

    await app.close();
    app = null;
    console.log(
      "Electron smoke passed: TFS discovery, roster mapping, local edits, timeline, persistence and offline restart; only reviewed task creation writes.",
    );
  } finally {
    if (app) await app.close();
    if (server.listening) await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
