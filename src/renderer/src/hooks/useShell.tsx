import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Item, Pod } from "@shared/model";
import {
  formatRoute,
  parseRoute,
  type NavPage,
  type Route,
} from "@/app/routes";

/** Route plus the transient UI layered over it: full screen, drawers and dialogs. */
function useShellState() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [dashboard, setDashboard] = useState<NavPage>(() =>
    route.page === "timeline" ? "timeline" : "overview",
  );
  const [full, setFull] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [previewPodId, setPreviewPodId] = useState<string>();
  const [basePanel, setBasePanel] = useState(false);
  const [taskTarget, setTaskTarget] = useState<Item>();
  const [closingPod, setClosingPod] = useState<Pod>();

  const show = useCallback((next: Route) => {
    setRoute(next);
    if (next.page === "overview" || next.page === "timeline")
      setDashboard(next.page);
    setFull(false);
    setPreviewPodId(undefined);
    setBasePanel(false);
    setTaskTarget(undefined);
  }, []);

  const navigate = useCallback(
    (next: Route) => {
      location.hash = formatRoute(next);
      show(next);
    },
    [show],
  );

  useEffect(() => {
    const hashChange = () => show(parseRoute(location.hash));
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("hashchange", hashChange);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", hashChange);
      window.removeEventListener("keydown", key);
    };
  }, [show]);

  return {
    route,
    /** The dashboard (Overview or Timeline) a pod page belongs to. */
    dashboard,
    navigate,
    full,
    setFull,
    /** Dashboards include closed pods. Filters never change assignments. */
    showPast,
    setShowPast,
    previewPodId,
    previewPod: setPreviewPodId,
    basePanel,
    setBasePanel,
    taskTarget,
    createTasks: setTaskTarget,
    closingPod,
    closePod: setClosingPod,
  };
}

export type Shell = ReturnType<typeof useShellState>;
const ShellContext = createContext<Shell | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const shell = useShellState();
  return (
    <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
  );
}

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw Error("useShell must be used inside ShellProvider");
  return shell;
}
