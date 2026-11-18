import { useId, useState } from "react";
import { Field, Input, Tab, TabList } from "@fluentui/react-components";
import {
  assignedMember,
  assignments,
  edit,
  members,
  move,
  podName,
  same,
  type Person,
  type Pod,
} from "@shared/model";
import { usePodWork } from "@/hooks/usePodWork";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { navLabels } from "@/app/routes";
import {
  ActionButton,
  ExternalLink,
  IconButton,
  Loading,
  StatusIcon,
} from "@/ui/controls";
import { PageToolbar } from "@/ui/PageToolbar";
import { PersonAvatar } from "@/ui/PersonAvatar";
import { StateBadge } from "@/ui/StateBadge";
import WorkItemPanel, { WorkItemRow } from "@/ui/WorkItemPanel";
import { WorkItemType } from "@/ui/WorkItemType";
import AddMembersDialog from "./AddMembersDialog";

/** A pod's page, or its preview inside the drawer (`drawer`). */
export default function PodDetails({
  pod,
  drawer = false,
}: {
  pod: Pod;
  drawer?: boolean;
}) {
  const { workspace, patchPod, persist } = useWorkspace();
  const { navigate, dashboard, createTasks, closePod } = useShell();
  const [tab, setTab] = useState(drawer ? "work" : "members");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const id = useId();
  const override = workspace.overrides[pod.id];
  const name = podName(workspace, pod);
  const people = members(workspace, pod).reduce<Person[]>((unique, member) => {
    const mapped =
      workspace.roster.find((entry) => same(entry, member)) ?? member;
    return unique.some((entry) => same(entry, mapped))
      ? unique
      : [...unique, mapped];
  }, []);
  const identityPool = [
    ...people,
    ...workspace.roster.filter(
      (entry) => !people.some((member) => same(entry, member)),
    ),
  ];
  const { work, roots, children, busy, errors, retry } = usePodWork(
    pod,
    !!workspace.boardUrl,
  );
  const workByMember = new Map<string, typeof work>();
  for (const item of work) {
    const member = assignedMember(item, identityPool);
    if (member)
      workByMember.set(member.id, [
        ...(workByMember.get(member.id) ?? []),
        item,
      ]);
  }

  return (
    <section
      className="pod-details"
      aria-label={drawer ? undefined : "Pod details"}
    >
      {!drawer && (
        <PageToolbar
          crumbs={[
            {
              label: navLabels[dashboard],
              onClick: () => navigate({ page: dashboard }),
            },
            { label: name },
          ]}
        />
      )}
      <div className="pod-metadata">
        <div className="pod-name-field">
          <WorkItemType type={pod.cm ? "CM POD" : "Pod"} />
          {pod.cm && <ExternalLink item={pod.cm} />}
          <Input
            aria-label="Pod name"
            appearance="underline"
            className="pod-name-input"
            placeholder={pod.lane}
            value={override?.name ?? pod.lane}
            onChange={(_, d) => patchPod(pod, { name: d.value })}
          />
          {pod.missing && (
            <StatusIcon message="Missing from the current board" />
          )}
        </div>
        <div className="pod-dates">
          <Field label="Start">
            <Input
              type="date"
              value={override?.start || pod.created || ""}
              onChange={(_, d) =>
                patchPod(pod, { start: d.value || undefined })
              }
            />
          </Field>
          <Field label="Expected finish">
            <Input
              type="date"
              value={override?.expected || pod.expected || ""}
              onChange={(_, d) =>
                patchPod(pod, { expected: d.value || undefined })
              }
            />
          </Field>
          <IconButton
            icon="reset"
            label="Use TFS expected finish"
            onClick={() => patchPod(pod, { expected: undefined })}
          />
        </div>
        <div className="pod-feature">
          <WorkItemType type="Feature" />
          <ExternalLink item={pod.feature} />
          <strong>{pod.feature.title}</strong>
          <StateBadge state={pod.feature.state} />
          <IconButton
            label={"Create tasks for #" + pod.feature.id}
            icon="add"
            onClick={() => createTasks(pod.feature)}
          />
        </div>
      </div>
      <div className="pod-roster">
        <div className="action-group">
          <ActionButton
            appearance="subtle"
            icon={rosterOpen ? "down" : "right"}
            aria-expanded={rosterOpen}
            aria-controls={id + "-roster"}
            onClick={() => setRosterOpen(!rosterOpen)}
          >
            {`Pod membership (${people.length})`}
          </ActionButton>
          {!override?.closed && (
            <IconButton
              label="Add members"
              icon="add"
              onClick={() => setAdding(true)}
            />
          )}
        </div>
        <ul id={id + "-roster"} hidden={!rosterOpen} className="roster-list">
          {people.map((member) => {
            const mapped = workspace.roster.find((entry) =>
              same(entry, member),
            );
            return (
              <li className="person" key={member.id}>
                <PersonAvatar person={member} />
                <strong>{member.name}</strong>
                {!mapped && (
                  <StatusIcon message="Unmatched: map their TFS account in Settings" />
                )}
                {!override?.closed && mapped && (
                  <span className="action-group">
                    {assignments(workspace, member).length > 1 && (
                      <ActionButton
                        onClick={() =>
                          persist(move(workspace, mapped.id, pod.id))
                        }
                      >
                        Keep here
                      </ActionButton>
                    )}
                    <ActionButton
                      onClick={() =>
                        persist(
                          edit(workspace, pod.id, {
                            members: people
                              .filter((other) => !same(other, member))
                              .map((other) => other.id),
                          }),
                        )
                      }
                    >
                      Return to Base
                    </ActionButton>
                  </span>
                )}
              </li>
            );
          })}
          {!people.length && <li>No members in this pod.</li>}
          {!override?.closed && override?.members !== undefined && (
            <li>
              <ActionButton
                icon="reset"
                onClick={() =>
                  persist(edit(workspace, pod.id, { members: undefined }))
                }
              >
                Use TFS members
              </ActionButton>
            </li>
          )}
        </ul>
      </div>
      <TabList
        aria-label="Pod work views"
        selectedValue={tab}
        onTabSelect={(_, data) => setTab(data.value as string)}
      >
        <Tab
          id={id + "-members"}
          aria-controls={id + "-content"}
          value="members"
        >
          Members
        </Tab>
        <Tab id={id + "-work"} aria-controls={id + "-content"} value="work">
          Work Items
        </Tab>
      </TabList>
      <div
        id={id + "-content"}
        className="tab-content"
        role="tabpanel"
        aria-labelledby={id + "-" + tab}
      >
        {busy && <Loading label="Loading linked work…" />}
        {Object.keys(errors).length > 0 && (
          <div className="action-group">
            <StatusIcon
              kind="error"
              message={Object.entries(errors)
                .map(([itemId, error]) => `#${itemId} · ${error}`)
                .join("\n")}
            />
            <span role="status">Some linked work could not be loaded.</span>
            <ActionButton onClick={retry} disabled={busy}>
              Retry
            </ActionButton>
          </div>
        )}
        {tab === "members" ? (
          people.length ? (
            <div className="member-cards">
              {people.map((member) => (
                <article className="member-card" key={member.id}>
                  <div className="member-card-heading">
                    <PersonAvatar person={member} size={32} />
                    <h3>{member.name}</h3>
                  </div>
                  {workByMember
                    .get(member.id)
                    ?.map((item) => (
                      <WorkItemRow key={item.id} item={item} />
                    )) ?? <p>No assigned work in this pod.</p>}
                </article>
              ))}
            </div>
          ) : (
            <p>No members in this pod.</p>
          )
        ) : roots.length ? (
          roots.map((item) => (
            <WorkItemPanel
              key={item.id}
              item={item}
              onCreate={createTasks}
              podChildren={children}
            />
          ))
        ) : (
          <p>No work items in this pod.</p>
        )}
      </div>
      <div className="pod-lifecycle">
        {override?.closed ? (
          <p>Closed {override.closed}</p>
        ) : (
          <ActionButton className="danger-button" onClick={() => closePod(pod)}>
            Close pod &amp; return members to Base
          </ActionButton>
        )}
      </div>
      {adding && !override?.closed && (
        <AddMembersDialog
          workspace={workspace}
          pod={pod}
          onClose={() => setAdding(false)}
          onSave={(next) => {
            persist(next);
            setAdding(false);
          }}
        />
      )}
    </section>
  );
}
