import { useEffect, useRef, useState } from "react";
import { ToggleButton, Tooltip } from "@fluentui/react-components";
import { podName, range, today, visible } from "@shared/model";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { displayDate } from "@/ui/format";
import { WorkItemType } from "@/ui/WorkItemType";

const scales = { Days: 44, Weeks: 16 } as const;
const tickFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/** Pod names open the pod page; bars open the preview. */
export default function TimelinePage() {
  const { workspace } = useWorkspace();
  const { navigate, previewPod, showPast } = useShell();
  const [scale, setScale] = useState<keyof typeof scales>("Days");
  const zoom = scales[scale];
  const pods = visible(workspace, showPast);
  const r = range(workspace, pods);
  const now = today();
  const day = (s: string) =>
    Math.round((Date.parse(s) - Date.parse(r.start)) / 86400000);
  const scroller = useRef<HTMLDivElement>(null);
  const todayOffset = day(now) * zoom;
  // Open with today in view, leaving room for recent history on the left.
  useEffect(() => {
    const el = scroller.current;
    if (el)
      el.scrollLeft = Math.max(0, todayOffset + 200 - el.clientWidth * 0.6);
  }, [todayOffset]);

  return (
    <>
      <div className="timeline-toolbar">
        <div className="action-group" role="group" aria-label="Timeline scale">
          {(Object.keys(scales) as (keyof typeof scales)[]).map((name) => (
            <ToggleButton
              key={name}
              checked={scale === name}
              appearance={scale === name ? "primary" : "subtle"}
              onClick={() => setScale(name)}
            >
              {name}
            </ToggleButton>
          ))}
        </div>
        <small>
          {displayDate(r.start)} – {displayDate(r.end)}
        </small>
        <ul className="legend" aria-label="Legend">
          <li>
            <i className="legend-elapsed" aria-hidden /> Elapsed
          </li>
          <li>
            <i className="legend-expected" aria-hidden /> Expected
          </li>
          <li>
            <i className="legend-today" aria-hidden /> Today
          </li>
        </ul>
      </div>
      <div className="timeline" ref={scroller}>
        <div style={{ width: Math.max(600, r.days * zoom + 200) }}>
          <div className="ticks" aria-hidden>
            {Array.from({ length: r.days }, (_, i) => (
              <span key={i} style={{ width: zoom }}>
                {zoom === scales.Days || i % 7 === 0
                  ? tickFormat.format(
                      new Date(Date.parse(r.start) + i * 86400000),
                    )
                  : ""}
              </span>
            ))}
          </div>
          {pods.map((pod) => {
            const o = workspace.overrides[pod.id] || {};
            const name = podName(workspace, pod);
            const start = o.start || pod.created;
            const end = o.closed || now;
            const expected = o.expected || pod.expected;
            return (
              <div className="track" key={pod.id}>
                <Tooltip content={`Open ${name}`} relationship="description">
                  <button
                    type="button"
                    className="tracklabel"
                    onClick={() => navigate({ page: "pod", id: pod.id })}
                  >
                    <WorkItemType type="Pod" />
                    <span className="item-summary">{name}</span>
                  </button>
                </Tooltip>
                <div className="rail">
                  <i className="today" style={{ left: day(now) * zoom }} />
                  {start ? (
                    <>
                      <button
                        type="button"
                        title={`Preview ${name}: ${pod.feature.title}`}
                        className="bar"
                        onClick={() => previewPod(pod.id)}
                        style={{
                          left: day(start) * zoom,
                          width: Math.max(
                            6,
                            (day(end) - day(start) + 1) * zoom,
                          ),
                        }}
                      >
                        {pod.feature.title}
                      </button>
                      {!o.closed && expected && expected > now && (
                        <span
                          className="forecast"
                          aria-hidden
                          style={{
                            left: (day(now) + 1) * zoom,
                            width: Math.max(
                              0,
                              (Math.min(day(expected), r.days - 1) - day(now)) *
                                zoom,
                            ),
                          }}
                        >
                          {expected > r.end ? "→" : ""}
                        </span>
                      )}
                      {!expected && !o.closed && (
                        <small className="unknown">
                          Expected finish unknown
                        </small>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="missing-start"
                      onClick={() => previewPod(pod.id)}
                    >
                      Start date needed
                    </button>
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
