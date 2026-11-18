import type { WorkspaceApp } from "../hooks/useWorkspaceApp";
import { today } from "../../../shared/model";
import { ActionButton } from "../ui/controls";
import { WorkItemType } from "../ui/WorkItemType";
export default function TimelinePage({
  app,
}: {
  app: Pick<
    WorkspaceApp,
    | "day"
    | "podClick"
    | "podDouble"
    | "pods"
    | "r"
    | "setZoom"
    | "workspace"
    | "zoom"
  >;
}) {
  const { workspace, zoom, setZoom, pods, r, day, podClick, podDouble } = app;
  return (
    <>
      <div className="row">
        <div>
          <small>
            {r.start} — {r.end}
          </small>
        </div>
        <ActionButton onClick={() => setZoom(44)}>Days</ActionButton>
        <ActionButton onClick={() => setZoom(16)}>Weeks</ActionButton>
        <small>Solid: elapsed · dashed: expected · │ today</small>
      </div>
      <div className="timeline">
        <div style={{ width: Math.max(600, r.days * zoom + 180) }}>
          <div className="ticks" style={{ marginLeft: 180 }}>
            {Array.from({ length: r.days }, (_, i) => (
              <span key={i} style={{ width: zoom }}>
                {zoom === 44 || i % 7 === 0
                  ? new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    }).format(new Date(Date.parse(r.start) + i * 86400000))
                  : ""}
              </span>
            ))}
          </div>
          {pods.map((pod) => {
            const o = workspace.overrides[pod.id] || {};
            const start = o.start || pod.created;
            const end = o.closed || today();
            const expected = o.expected || pod.expected;
            return (
              <div className="track" key={pod.id}>
                <ActionButton
                  className="tracklabel"
                  onClick={() => podClick(pod.id)}
                  onDoubleClick={() => podDouble(pod.id)}
                >
                  <WorkItemType type="Pod" />
                  {o.name || pod.lane}
                </ActionButton>
                <div className="rail">
                  <i className="today" style={{ left: day(today()) * zoom }} />
                  {start ? (
                    <>
                      <ActionButton
                        title={pod.feature.title}
                        className="bar type-feature"
                        onClick={() => podClick(pod.id)}
                        onDoubleClick={() => podDouble(pod.id)}
                        style={{
                          left: day(start) * zoom,
                          width: Math.max(
                            6,
                            (day(end) - day(start) + 1) * zoom,
                          ),
                        }}
                      >
                        {pod.feature.title}
                      </ActionButton>
                      {!o.closed && expected && expected > today() && (
                        <ActionButton
                          className="forecast"
                          onClick={() => podClick(pod.id)}
                          onDoubleClick={() => podDouble(pod.id)}
                          style={{
                            left: (day(today()) + 1) * zoom,
                            width: Math.max(
                              0,
                              (Math.min(day(expected), r.days - 1) -
                                day(today())) *
                                zoom,
                            ),
                          }}
                        >
                          {expected > r.end ? "→" : ""}
                        </ActionButton>
                      )}
                      {!expected && !o.closed && (
                        <small className="unknown">
                          Expected finish unknown
                        </small>
                      )}
                    </>
                  ) : (
                    <ActionButton
                      onClick={() => podClick(pod.id)}
                      onDoubleClick={() => podDouble(pod.id)}
                    >
                      Start date needed
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
