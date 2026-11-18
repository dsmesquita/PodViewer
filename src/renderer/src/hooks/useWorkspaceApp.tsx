import { useEffect, useRef, useState } from "react";
import {
  edit,
  emptyWorkspace,
  range,
  today,
  visible,
  type Pod,
  type Workspace,
} from "../../../shared/model";
export function useWorkspaceApp() {
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [view, setView] = useState(location.hash.slice(1) || "overview");
  const [full, setFull] = useState(false);
  const [basePanel, setBasePanel] = useState(false);
  const [work, setWork] = useState<import("../../../shared/model").Item>();
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = (v: string) => {
    clearTimeout(clickTimer.current);
    location.hash = v;
    setView(v);
    setFull(false);
    setSelectedPod(undefined);
    setBasePanel(false);
    setWork(undefined);
  };
  useEffect(() => {
    const hash = () => {
      clearTimeout(clickTimer.current);
      setSelectedPod(undefined);
      setBasePanel(false);
      setWork(undefined);
      setView(location.hash.slice(1) || "overview");
      setFull(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFull(false);
      }
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const podClick = (id: string) => {
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setSelectedPod(id), 350);
  };
  const podDouble = (id: string) => {
    clearTimeout(clickTimer.current);
    navigate("pod/" + id);
  };

  const [past, setShowPast] = useState(false);
  const [selected, setSelectedPod] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setAuthMode] = useState("windows");
  const [token, setToken] = useState("");
  const [zoom, setZoom] = useState(44);
  const [prompt, setClosurePrompt] = useState<string>();
  const saving = useRef(Promise.resolve());
  const persist = (next: Workspace) => {
    setWorkspace(next);
    if (window.api)
      saving.current = saving.current.then(async () => {
        const r = await window.api!.save(next);
        if (!r.ok) setError(r.message);
      });
  };
  const refresh = async () => {
    if (!window.api) {
      setError(
        "TFS is available in the Windows app. Use sample data for browser preview.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saving.current;
      const r = await window.api.refresh();
      if (r.ok) {
        setWorkspace(r.value);
        const pod = visible(r.value, false).find(
          (pod) =>
            /^(resolved|closed)$/i.test(pod.feature.state) &&
            !r.value.overrides[pod.id]?.closed &&
            !r.value.overrides[pod.id]?.dismissed,
        );
        if (pod) setClosurePrompt(pod.id);
      } else setError(r.message);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let alive = true;
    if (window.api)
      window.api
        .load()
        .then(async (r) => {
          if (!alive) return;
          setWorkspace(r.workspace);
          setAuthMode(r.mode);
          if (r.workspace.boardUrl) {
            setBusy(true);
            try {
              const result = await window.api!.refresh();
              if (alive) {
                if (result.ok) {
                  setWorkspace(result.value);
                  const pod = visible(result.value, false).find(
                    (pod) =>
                      /^(resolved|closed)$/i.test(pod.feature.state) &&
                      !result.value.overrides[pod.id]?.closed &&
                      !result.value.overrides[pod.id]?.dismissed,
                  );
                  if (pod) setClosurePrompt(pod.id);
                } else setError(result.message);
              }
            } finally {
              if (alive) setBusy(false);
            }
          }
        })
        .catch((e) => setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);
  const pods = visible(workspace, past);
  const pod = workspace.pods.find(
    (pod) => pod.id === (view.startsWith("pod/") ? view.slice(4) : selected),
  );
  const r = range(workspace, pods);
  const day = (s: string) =>
    Math.round((Date.parse(s) - Date.parse(r.start)) / 86400000);
  const owners = [
    ...new Map(
      workspace.pods
        .filter((pod) => pod.owner)
        .map((pod) => [pod.owner!.id, pod.owner!]),
    ).values(),
  ];
  const patch = (pod: Pod, value: Parameters<typeof edit>[2]) => {
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
    clickTimer,
    workspace,
    setWorkspace,
    view,
    navigate,
    full,
    setFull,
    basePanel,
    setBasePanel,
    work,
    setWork,
    past,
    setShowPast,
    selected,
    setSelectedPod,
    busy,
    setBusy,
    error,
    setError,
    notice,
    setNotice,
    mode,
    setAuthMode,
    token,
    setToken,
    zoom,
    setZoom,
    prompt,
    setClosurePrompt,
    persist,
    refresh,
    pods,
    pod,
    r,
    day,
    owners,
    patch,
    podClick,
    podDouble,
  };
}
export type WorkspaceApp = ReturnType<typeof useWorkspaceApp>;
