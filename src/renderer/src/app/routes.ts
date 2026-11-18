export const navPages = [
  "overview",
  "timeline",
  "base",
  "skills",
  "settings",
] as const;
export type NavPage = (typeof navPages)[number];

export type Route =
  | { page: NavPage }
  | { page: "pod"; id: string }
  | { page: "feature"; id: number };

export const navLabels: Record<NavPage, string> = {
  overview: "Overview",
  timeline: "Timeline",
  base: "Base",
  skills: "Skills",
  settings: "Settings",
};

const isNavPage = (value: string): value is NavPage =>
  (navPages as readonly string[]).includes(value);

/** Hash routes: #overview, #pod/<pod id>, #feature/<work-item id>. Unknown hashes open Overview. */
export function parseRoute(hash: string): Route {
  const value = hash.replace(/^#/, "");
  if (value.startsWith("pod/") && value.length > 4)
    return { page: "pod", id: decodeURIComponent(value.slice(4)) };
  if (value.startsWith("feature/")) {
    const id = Number(value.slice(8));
    if (Number.isSafeInteger(id) && id > 0) return { page: "feature", id };
  }
  return { page: isNavPage(value) ? value : "overview" };
}

export function formatRoute(route: Route): string {
  if (route.page === "pod") return "pod/" + encodeURIComponent(route.id);
  if (route.page === "feature") return "feature/" + route.id;
  return route.page;
}

/** The navigation entry a route belongs to: pods to their dashboard, Features to Base. */
export function navSection(route: Route, dashboard: NavPage): NavPage {
  if (route.page === "pod") return dashboard;
  if (route.page === "feature") return "base";
  return route.page;
}
