import { useState } from "react";
import Modal from "./ui/Modal";
import TimelinePage from "./pages/TimelinePage";
import OverviewPage from "./pages/OverviewPage";
import { assignments, same, edit, today, type Pod } from "../../shared/model";
import { ActionButton } from "./ui/controls";
import PodDetails from "./pages/PodDetails";
import SkillsPage from "./pages/SkillsPage";
import SettingsPage from "./pages/SettingsPage";
import BasePage from "./BasePage";
import TaskCreationDialog from "./TaskCreationDialog";

import FeaturePage from "./pages/FeaturePage";
import { IconButton, StatusIcon } from "./ui/controls";
import { sample } from "../../shared/sample";
import { useWorkspaceApp } from "./hooks/useWorkspaceApp";
export default function App() {
  const app = useWorkspaceApp();
  const {
    clickTimer,
    workspace,
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
    setSelectedPod,
    busy,
    error,
    notice,
    prompt,
    setClosurePrompt,
    persist,
    refresh,
    pods,
    pod,
  } = app;
  const [closingPod, setClosingPod] = useState<Pod>();
  const [replaceSample, setReplaceSample] = useState(false);
  const scheduledClosure = workspace.pods.find((entry) => entry.id === prompt);
  const closure = closingPod ?? scheduledClosure;
  return (
    <>
      <header hidden={full}>
        <div className="brand">
          <span className="logo">◈</span>
          <div>
            <strong>Pod Viewer</strong>
            <small>PEOPLE · PURPOSE · PROGRESS</small>
          </div>
        </div>
        <nav>
          {["overview", "timeline", "base", "skills", "settings"].map((v) => (
            <ActionButton
              appearance="subtle"
              className={view === v ? "active" : ""}
              key={v}
              onClick={() => navigate(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </ActionButton>
          ))}
        </nav>
        <IconButton
          label={busy ? "Refreshing" : "Refresh"}
          icon="refresh"
          disabled={busy}
          onClick={refresh}
        />
      </header>
      <main className={full ? "focus-content" : ""}>
        <div className="row">
          <IconButton label="Back" icon="back" onClick={() => history.back()} />

          <IconButton
            label={full ? "Restore" : "Full screen"}
            icon={full ? "restore" : "expand"}
            onClick={() => setFull(!full)}
          />
        </div>
        {view === "base" && (
          <BasePage
            workspace={workspace}
            save={persist}
            open={setWork}
            onFeature={(item) => navigate("feature/" + item.id)}
          />
        )}

        <StatusIcon message={error} kind="error" />
        <StatusIcon message={notice} kind="info" />
        {view.startsWith("feature/") &&
          workspace.baseItems.find((i) => i.id === Number(view.slice(8))) && (
            <FeaturePage
              key={view}
              item={workspace.baseItems.find(
                (i) => i.id === Number(view.slice(8)),
              )!}
              onCreate={setWork}
            />
          )}
        {view !== "settings" && view !== "skills" ? (
          <>
            {!view.startsWith("pod/") && (
              <div className="summary">
                <div>
                  <strong>
                    {
                      pods.filter((pod) => !workspace.overrides[pod.id]?.closed)
                        .length
                    }
                  </strong>{" "}
                  active pods
                </div>
                <div>
                  <strong>{workspace.roster.length}</strong> domain members
                </div>
                <div>
                  <strong>
                    {
                      workspace.roster.filter(
                        (m) => !assignments(workspace, m).length,
                      ).length
                    }
                  </strong>{" "}
                  in Base
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={past}
                    onChange={(e) => setShowPast(e.target.checked)}
                  />{" "}
                  Show past pods
                </label>
              </div>
            )}
            <div
              className={
                view === "base" ||
                view.startsWith("pod/") ||
                view.startsWith("feature/")
                  ? "workspace hidden-workspace"
                  : "workspace"
              }
            >
              <section>
                {!workspace.pods.length ? (
                  <div className="empty">
                    <span>◈</span>
                    <h2>Your next feature starts here.</h2>
                    <p>
                      Connect your TFS Features board in Settings to discover
                      its pods.
                    </p>
                    <ActionButton onClick={() => navigate("settings")}>
                      Connect board
                    </ActionButton>
                    <ActionButton
                      onClick={() => {
                        if (!workspace.boardUrl) persist(sample());
                      }}
                    >
                      Load sample data
                    </ActionButton>
                  </div>
                ) : view === "overview" ? (
                  <OverviewPage app={app} />
                ) : (
                  <TimelinePage app={app} />
                )}
                {workspace.pods.length > 0 && !pods.length && (
                  <div className="empty">
                    No pods match the current owner and history filters.
                  </div>
                )}
              </section>
              <aside>
                <div className="row">
                  <h2>
                    <ActionButton
                      onClick={() => {
                        clearTimeout(clickTimer.current);
                        clickTimer.current = setTimeout(
                          () => setBasePanel(true),
                          350,
                        );
                      }}
                      onDoubleClick={() => {
                        clearTimeout(clickTimer.current);
                        navigate("base");
                      }}
                    >
                      Base
                    </ActionButton>
                  </h2>
                  <ActionButton
                    icon="open"
                    label="Open page"
                    onClick={() => navigate("base")}
                  >
                    Open page
                  </ActionButton>
                  <span className="badge">Available</span>
                </div>
                <p>Maintenance, preparation and a helping hand.</p>
                {workspace.roster
                  .filter((m) => !assignments(workspace, m).length)
                  .map((m) => (
                    <div className="person" key={m.id}>
                      <span className="avatar">{m.name[0]}</span>
                      <div>
                        <strong>{m.name}</strong>
                        {!workspace.roster.some((r) => same(r, m)) && (
                          <StatusIcon message="Unmatched: map their TFS account in Settings" />
                        )}
                        <small>
                          {Object.entries(workspace.levels[m.id] || {})
                            .filter(([, n]) => n >= 3)
                            .map(([s]) => s)
                            .join(" · ") || "Skills not recorded"}
                        </small>
                      </div>
                    </div>
                  ))}
                {!workspace.roster.length && (
                  <p>Add your domain members in Settings.</p>
                )}
                {workspace.roster
                  .filter((m) => assignments(workspace, m).length > 1)
                  .map((m) => (
                    <StatusIcon
                      key={m.id}
                      message={
                        m.name +
                        ": assignment conflict. Open a pod to resolve it."
                      }
                    />
                  ))}
              </aside>
            </div>
          </>
        ) : (
          <div className="settings">
            {view === "settings" && <SettingsPage app={app} />}{" "}
            {view === "settings" && (
              <ActionButton onClick={() => navigate("skills")}>
                Manage skills
              </ActionButton>
            )}
            {view === "skills" && <SkillsPage app={app} />}
          </div>
        )}
        {pod &&
          (view.startsWith("pod/") ? (
            <PodDetails
              key={"page-" + pod.id}
              app={app}
              close={setClosingPod}
            />
          ) : (
            <div className="overlay" onClick={() => setSelectedPod(undefined)}>
              <PodDetails
                key={"drawer-" + pod.id}
                app={app}
                close={setClosingPod}
                drawer
              />
            </div>
          ))}
        {closure && (
          <ClosureDialog
            key={closure.id}
            start={workspace.overrides[closure.id]?.start || closure.created}
            name={workspace.overrides[closure.id]?.name || closure.lane}
            onClose={() => {
              if (!closingPod && scheduledClosure)
                persist(edit(workspace, closure.id, { dismissed: true }));
              setClosingPod(undefined);
              setClosurePrompt(undefined);
            }}
            onSave={(date) => {
              persist(edit(workspace, closure.id, { closed: date }));
              setClosingPod(undefined);
              setClosurePrompt(undefined);
            }}
          />
        )}
        {replaceSample && (
          <Modal
            title="Load sample data"
            onClose={() => setReplaceSample(false)}
            onSave={() => {
              persist(sample());
              setReplaceSample(false);
              navigate("overview");
            }}
          >
            <p>
              Replace this local workspace with sample data? This replaces its
              roster, skills, pod overrides, and board settings.
            </p>
          </Modal>
        )}
        {basePanel && (
          <div className="overlay">
            <section className={full ? "drawer expanded" : "drawer"}>
              <ActionButton
                icon="close"
                label="Close Base"
                onClick={() => setBasePanel(false)}
              >
                Close Base
              </ActionButton>
              <ActionButton
                icon="open"
                label="Open page"
                onClick={() => navigate("base")}
              >
                Open page
              </ActionButton>
              <IconButton
                label={full ? "Restore" : "Full screen"}
                icon={full ? "restore" : "expand"}
                onClick={() => setFull(!full)}
              />
              <BasePage
                workspace={workspace}
                save={persist}
                open={setWork}
                onFeature={(item) => navigate("feature/" + item.id)}
              />
            </section>
          </div>
        )}
        {work && (
          <TaskCreationDialog
            key={work.id}
            item={work}
            workspace={workspace}
            onClose={() => setWork(undefined)}
          />
        )}
      </main>
      <footer>
        Pod Viewer <span>Local planning · Connected to TFS</span>
        <ActionButton onClick={() => setReplaceSample(true)}>
          Load sample data
        </ActionButton>
      </footer>
    </>
  );
}

function ClosureDialog({
  name,
  start,
  onClose,
  onSave,
}: {
  name: string;
  start?: string;
  onClose: () => void;
  onSave: (date: string) => void;
}) {
  const [date, setDate] = useState(today);
  const valid = !!date && date <= today() && (!start || date >= start);
  return (
    <Modal
      title="Close pod"
      onClose={onClose}
      onSave={() => onSave(date)}
      disabled={!valid}
    >
      <p>Close {name} and return its members to Base.</p>
      <label>
        Actual closure date
        <input
          type="date"
          value={date}
          min={start}
          max={today()}
          required
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      {!valid && (
        <p role="status">
          Enter a valid closure date between the pod start and today.
        </p>
      )}
    </Modal>
  );
}
