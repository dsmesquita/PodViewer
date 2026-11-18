// Resets the git-ignored mock/ folder used by `npm run dev:mock` and `npm run dev:web`.
//   npm run mock:reset           deletes mock/.profile (local edits made while testing)
//   npm run mock:reset -- --all  deletes mock/ entirely; it is re-seeded on the next start
const { rmSync } = require("node:fs");
const { join, resolve } = require("node:path");

const dir = resolve(__dirname, "..", "mock");
const all = process.argv.includes("--all");
rmSync(all ? dir : join(dir, ".profile"), { recursive: true, force: true });
console.log(
  all
    ? "Deleted mock/. It is re-seeded the next time a mock mode starts."
    : "Deleted mock/.profile. The next start uses mock/workspace.json again.",
);
