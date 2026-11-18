import {
  isFeatureFinished,
  members,
  podName,
  stateCategory,
  visible,
  type Pod,
} from "@shared/model";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { IconButton, StatusIcon } from "@/ui/controls";
import { PeopleAvatars } from "@/ui/PersonAvatar";
import { StateBadge } from "@/ui/StateBadge";
import { WorkItemType } from "@/ui/WorkItemType";

function Progress({ pod }: { pod: Pod }) {
  const categories = pod.workItems.map((item) => stateCategory(item.state));
  const count = (category: string) =>
    categories.filter((c) => c === category).length;
  const done = count("done") + count("resolved");
  const summary = `${done} of ${pod.workItems.length} work items done`;
  return (
    <div className="progress-block">
      <div className="progress" role="img" aria-label={summary}>
        {categories.map((category, i) => (
          <i key={pod.workItems[i].id} className={"progress-" + category} />
        ))}
      </div>
      <small>
        {pod.workItems.length
          ? `${summary} · ${count("active")} active · ${count("proposed")} not started`
          : "No linked work items"}
      </small>
    </div>
  );
}

/** Pod cards. The pod name is the card's single link; other controls sit above it. */
export default function OverviewPage() {
  const { workspace } = useWorkspace();
  const { navigate, previewPod, showPast } = useShell();
  const pods = visible(workspace, showPast);
  const emptyLanes = workspace.lanes.filter(
    (l) =>
      l.id !== workspace.baseLane &&
      !workspace.pods.some((pod) => !pod.missing && pod.laneId === l.id),
  );
  return (
    <div className="cards">
      {pods.map((pod) => {
        const name = podName(workspace, pod);
        const closed = workspace.overrides[pod.id]?.closed;
        const people = members(workspace, pod);
        return (
          <article className="card pod-card" key={pod.id}>
            <div className="cardtop">
              <WorkItemType type="Pod" />
              {closed ? (
                <span className="eyebrow">Closed {closed}</span>
              ) : (
                <span className="eyebrow">
                  {pod.feature.column || pod.feature.state}
                </span>
              )}
              {pod.missing && (
                <StatusIcon message="Missing from the current board" />
              )}
              {isFeatureFinished(pod) && !closed && (
                <StatusIcon
                  kind="info"
                  message="Feature resolved in TFS: ready to close"
                />
              )}
            </div>
            <h2>
              <button
                type="button"
                className="card-title"
                onClick={() => navigate({ page: "pod", id: pod.id })}
              >
                {name}
              </button>
            </h2>
            <p className="card-feature">
              <WorkItemType type="Feature" />
              <span>#{pod.feature.id}</span>
              <span className="item-summary" title={pod.feature.title}>
                {pod.feature.title}
              </span>
              <StateBadge state={pod.feature.state} />
            </p>
            <Progress pod={pod} />
            <div className="cardfooter">
              <div className="avatars">
                <PeopleAvatars people={people} />
                <small>
                  {people.length} {people.length === 1 ? "member" : "members"}
                </small>
              </div>
              <IconButton
                icon="panel"
                label={"Open pod details for " + name}
                onClick={() => previewPod(pod.id)}
              />
            </div>
          </article>
        );
      })}
      {emptyLanes.map((l) => (
        <div className="card empty-lane" key={"empty-" + l.id}>
          <span className="eyebrow">{l.name}</span>
          <h2>Empty pod lane</h2>
          <p>
            A Feature added to this lane in TFS appears after the next refresh.
          </p>
        </div>
      ))}
    </div>
  );
}
