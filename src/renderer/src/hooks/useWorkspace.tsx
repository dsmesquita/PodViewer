import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ConnectionMode } from "@shared/api";
import {
  edit,
  emptyWorkspace,
  pendingClosure,
  today,
  type Override,
  type Pod,
  type Workspace,
} from "@shared/model";
import { useNotify } from "@/ui/Notifications";
import { api } from "./api";

function useWorkspaceStore() {
  const notify = useNotify();
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [mode, setMode] = useState<ConnectionMode>("windows");
  const [hasPat, setHasPat] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closurePrompt, setClosurePrompt] = useState<string>();
  const saving = useRef(Promise.resolve());

  const persist = useCallback((next: Workspace) => {
    setWorkspace(next);
    const bridge = api();
    if (bridge)
      saving.current = saving.current.then(async () => {
        const result = await bridge.save(next);
        if (!result.ok) setError(result.message);
      });
  }, []);

  /** Reads TFS (or mock data). Cached data stays on screen when the read fails. */
  const refresh = useCallback(
    async (options: { announce?: boolean } = {}) => {
      const bridge = api();
      if (!bridge) {
        setError("TFS is available in the Windows app.");
        return false;
      }
      setBusy(true);
      try {
        await saving.current;
        const result = await bridge.refresh();
        if (!result.ok) {
          setError(result.message);
          return false;
        }
        setError("");
        setWorkspace(result.value);
        setClosurePrompt(pendingClosure(result.value)?.id);
        if (options.announce !== false) notify("Pods refreshed");
        return true;
      } catch (e) {
        setError(String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );

  const refreshOnLoad = useRef(refresh);
  refreshOnLoad.current = refresh;
  useEffect(() => {
    let alive = true;
    const bridge = api();
    if (!bridge) {
      setLoaded(true);
      return;
    }
    bridge
      .load()
      .then(async (result) => {
        if (!alive) return;
        setWorkspace(result.workspace);
        setMode(result.mode);
        setHasPat(result.hasPat);
        setLoaded(true);
        if (result.workspace.boardUrl)
          await refreshOnLoad.current({ announce: false });
      })
      .catch((e) => {
        setError(String(e));
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Applies a local pod override after checking its date rules. */
  const patchPod = (pod: Pod, value: Partial<Override>) => {
    const override = workspace.overrides[pod.id];
    const start =
      ("start" in value ? value.start : override?.start) || pod.created;
    const expected =
      ("expected" in value ? value.expected : override?.expected) ||
      pod.expected;
    if (value.start && value.start > today()) {
      setError("Future pod starts are not supported in this version.");
      return;
    }
    if (
      ("start" in value || "expected" in value) &&
      expected &&
      start &&
      expected < start
    ) {
      setError("Expected finish must be on or after the start date.");
      return;
    }
    persist(edit(workspace, pod.id, value));
  };

  return {
    workspace,
    mode,
    setMode,
    hasPat,
    setHasPat,
    loaded,
    busy,
    error,
    setError,
    persist,
    refresh,
    patchPod,
    closurePrompt,
    clearClosurePrompt: () => setClosurePrompt(undefined),
  };
}

export type WorkspaceStore = ReturnType<typeof useWorkspaceStore>;
const WorkspaceContext = createContext<WorkspaceStore | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const store = useWorkspaceStore();
  return (
    <WorkspaceContext.Provider value={store}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/** The workspace, its persistence and the TFS connection state. */
export function useWorkspace(): WorkspaceStore {
  const store = useContext(WorkspaceContext);
  if (!store) throw Error("useWorkspace must be used inside WorkspaceProvider");
  return store;
}
