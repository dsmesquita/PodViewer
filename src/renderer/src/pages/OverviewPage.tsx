import type { WorkspaceApp } from "../hooks/useWorkspaceApp";
import { members } from "../../../shared/model";
import { IconButton, StatusIcon } from "../ui/controls";
import { WorkItemType } from "../ui/WorkItemType";
export default function OverviewPage({
  app,
}: {
  app: Pick<WorkspaceApp, "navigate" | "setSelectedPod" | "pods" | "workspace">;
}) {
  const { workspace, pods, navigate, setSelectedPod } = app;
  return (
    <div className="cards">
      {pods.map((pod) => (
        <article
          className="card pod-card"
          key={pod.id}
          onClick={(event) => {
            if (
              event.currentTarget.contains(event.target as Node) &&
              !(event.target as Element).closest("button,a")
            )
              navigate("pod/" + pod.id);
          }}
        >
          <div className="cardtop">
            <WorkItemType type="Pod" />
            <span className="eyebrow">
              {workspace.overrides[pod.id]?.name || pod.lane}
            </span>
            <span className="badge">
              {workspace.overrides[pod.id]?.closed
                ? "Past"
                : pod.feature.column || pod.feature.state}
            </span>
          </div>
          <h2>
            <button
              className="card-title"
              onClick={() => navigate("pod/" + pod.id)}
            >
              {pod.feature.title}
            </button>
          </h2>
          <p className="action-group">
            <WorkItemType type="Feature" />#{pod.feature.id} · State:{" "}
            {pod.feature.state}
          </p>
          <div className="avatars">
            {members(workspace, pod).map((m) => (
              <span key={m.id} title={m.name}>
                {m.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            ))}
            <small>{members(workspace, pod).length} members</small>
          </div>
          <div className="progress">
            {pod.workItems.map((s) => (
              <i
                key={s.id}
                className={
                  /closed|done/i.test(s.state)
                    ? "done"
                    : /active/i.test(s.state)
                      ? "doing"
                      : ""
                }
              />
            ))}
          </div>
          <div className="statuscounts">
            {[...new Set(pod.workItems.map((s) => s.state))].map((state) => (
              <span key={state}>
                {state}: {pod.workItems.filter((s) => s.state === state).length}
              </span>
            ))}
          </div>
          <div className="cardfooter">
            <span>
              {pod.workItems.filter((s) => /closed|done/i.test(s.state)).length}
              /{pod.workItems.length} work items done
            </span>
            <IconButton
              icon="panel"
              label={
                "Open pod details for " +
                (workspace.overrides[pod.id]?.name || pod.lane)
              }
              onClick={() => setSelectedPod(pod.id)}
            />
          </div>
          {pod.missing && (
            <span
              title="Missing from current board"
              aria-label="Missing from current board"
            >
              ⚠
            </span>
          )}
          {/resolved|closed/i.test(pod.feature.state) &&
            !workspace.overrides[pod.id]?.closed && (
              <StatusIcon message="Ready to close" />
            )}
        </article>
      ))}
      {workspace.lanes
        .filter(
          (l) =>
            l.id !== workspace.baseLane &&
            !workspace.pods.some((pod) => !pod.missing && pod.laneId === l.id),
        )
        .map((l) => (
          <div className="card" key={"empty-" + l.id}>
            <span className="eyebrow">{l.name}</span>
            <h2>Empty pod lane</h2>
            <p>
              A Feature added to this lane in TFS will appear after refresh.
            </p>
          </div>
        ))}
    </div>
  );
}
