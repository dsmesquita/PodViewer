import { useId, useState } from "react";
import { Tab, TabList } from "@fluentui/react-components";
import {
  assignedMember,
  assignments,
  edit,
  members,
  move,
  same,
  type Person,
  type Pod,
  type Workspace,
} from "../../../shared/model";
import type { WorkspaceApp } from "../hooks/useWorkspaceApp";
import { usePodWork } from "../hooks/usePodWork";
import {
  ActionButton,
  ExternalLink,
  IconButton,
  StatusIcon,
} from "../ui/controls";
import Modal from "../ui/Modal";
import { WorkItemType } from "../ui/WorkItemType";
import WorkItemPanel, { WorkItemRow } from "../WorkItemPanel";

export default function PodDetails({
  app,
  close,
  drawer = false,
}: {
  app: WorkspaceApp;
  close: (pod: Pod) => void;
  drawer?: boolean;
}) {
  const {
    workspace,
    patch,
    persist,
    setWork,
    full,
    setFull,
    setSelectedPod,
    navigate,
  } = app;
  const pod = app.pod!;
  const [tab, setTab] = useState(drawer ? "work" : "members");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const tabsId = useId();
  const override = workspace.overrides[pod.id];
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
      className={
        drawer
          ? `drawer pod-details${full ? " expanded" : ""}`
          : "pod-page pod-details"
      }
      role={drawer ? "dialog" : undefined}
      aria-modal={drawer ? true : undefined}
      aria-label="Pod details"
      onClick={drawer ? (event) => event.stopPropagation() : undefined}
    >
      {drawer && (
        <div className="action-group">
          <ActionButton onClick={() => setSelectedPod(undefined)}>
            Close
          </ActionButton>
          <ActionButton
            icon="open"
            label="Open page"
            onClick={() => navigate("pod/" + pod.id)}
          >
            Open page
          </ActionButton>
          <IconButton
            label={full ? "Restore" : "Full screen"}
            icon={full ? "restore" : "expand"}
            onClick={() => setFull(!full)}
          />
        </div>
      )}
      <div className="pod-metadata">
        <div className="pod-name-field">
          <WorkItemType type={pod.cm ? "CM POD" : "Pod"} />
          {pod.cm && <ExternalLink item={pod.cm} />}
          <input
            aria-label="Pod name"
            placeholder={pod.lane}
            value={override?.name ?? pod.lane}
            onChange={(event) => patch(pod, { name: event.target.value })}
          />
        </div>
        <div className="pod-dates">
          <label>
            Start
            <input
              type="date"
              value={override?.start || pod.created || ""}
              onChange={(event) =>
                patch(pod, { start: event.target.value || undefined })
              }
            />
          </label>
          <label>
            Expected finish
            <input
              type="date"
              value={override?.expected || pod.expected || ""}
              onChange={(event) =>
                patch(pod, { expected: event.target.value || undefined })
              }
            />
          </label>
          <IconButton
            icon="reset"
            label="Use TFS expected finish"
            onClick={() => patch(pod, { expected: undefined })}
          />
        </div>
        <div className="pod-feature">
          <WorkItemType type="Feature" />
          <ExternalLink item={pod.feature} />
          <strong>{pod.feature.title}</strong>
          <span className="badge">{pod.feature.state}</span>
          <IconButton
            label={"Create tasks for #" + pod.feature.id}
            icon="add"
            onClick={() => setWork(pod.feature)}
          />
        </div>
      </div>
      <div className="pod-roster">
        <div className="action-group">
          <ActionButton
            appearance="subtle"
            icon={rosterOpen ? "down" : "right"}
            label="Pod membership"
            aria-expanded={rosterOpen}
            aria-controls={tabsId + "-roster"}
            onClick={() => setRosterOpen(!rosterOpen)}
          >
            Members · {people.length}
          </ActionButton>
          {!override?.closed && (
            <IconButton
              label="Add members"
              icon="add"
              onClick={() => setAdding(true)}
            />
          )}
        </div>
        <div id={tabsId + "-roster"} hidden={!rosterOpen}>
          {people.map((member) => {
            const mapped = workspace.roster.find((entry) =>
              same(entry, member),
            );
            return (
              <div className="person" key={member.id}>
                <strong>{member.name}</strong>
                {!mapped && (
                  <StatusIcon message="Unmatched: map their TFS account in Settings" />
                )}
                {!override?.closed && mapped && (
                  <>
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
                  </>
                )}
              </div>
            );
          })}
          {!people.length && <p>No members in this pod.</p>}
          {!override?.closed && (
            <ActionButton
              icon="reset"
              label="Use TFS members"
              onClick={() =>
                persist(edit(workspace, pod.id, { members: undefined }))
              }
            >
              Use TFS members
            </ActionButton>
          )}
        </div>
      </div>
      <TabList
        aria-label="Pod work views"
        selectedValue={tab}
        onTabSelect={(_, data) => setTab(data.value as string)}
      >
        <Tab
          id={tabsId + "-members"}
          aria-controls={tabsId + "-content"}
          value="members"
        >
          Members
        </Tab>
        <Tab
          id={tabsId + "-work"}
          aria-controls={tabsId + "-content"}
          value="work"
        >
          Work Items
        </Tab>
      </TabList>
      <div
        id={tabsId + "-content"}
        className="tab-content"
        role="tabpanel"
        aria-labelledby={tabsId + "-" + tab}
      >
        {busy && <p role="status">Loading linked work…</p>}
        {Object.keys(errors).length > 0 && (
          <div className="action-group">
            <p role="status">Some linked work could not be loaded.</p>
            <StatusIcon
              kind="error"
              message={Object.entries(errors)
                .map(([id, error]) => `#${id} · ${error}`)
                .join("\n")}
            />
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
                  <h3>{member.name}</h3>
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
              onCreate={setWork}
              podChildren={children}
            />
          ))
        ) : (
          <p>No work items in this pod.</p>
        )}
      </div>
      {override?.closed ? (
        <p>Closed {override.closed}</p>
      ) : (
        <ActionButton className="danger" onClick={() => close(pod)}>
          Close pod &amp; return members to Base
        </ActionButton>
      )}
      {adding && !override?.closed && (
        <AddMembers
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

function AddMembers({
  workspace,
  pod,
  onSave,
  onClose,
}: {
  workspace: Workspace;
  pod: Pod;
  onSave: (workspace: Workspace) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const current = members(workspace, pod);
  const candidates = workspace.roster.filter(
    (person) => !current.some((member) => same(person, member)),
  );
  const matches = candidates.filter((person) =>
    `${person.name} ${person.account ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const selectedPeople = candidates.filter((person) =>
    selected.includes(person.id),
  );
  return (
    <Modal
      title="Add members to pod"
      onClose={onClose}
      disabled={!selectedPeople.length}
      onSave={() => {
        onSave(
          selectedPeople.reduce(
            (next, person) => move(next, person.id, pod.id),
            workspace,
          ),
        );
      }}
    >
      <label>
        Search team members
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {matches.map((person) => {
        const otherPods = assignments(workspace, person);
        return (
          <label className="member-choice" key={person.id}>
            <input
              type="checkbox"
              checked={selected.includes(person.id)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, person.id]
                    : selected.filter((id) => id !== person.id),
                )
              }
            />
            <span>
              {person.name}
              {person.account && <small>{person.account}</small>}
              {!!otherPods.length && (
                <small>
                  Moves from{" "}
                  {otherPods
                    .map(
                      (other) =>
                        workspace.overrides[other.id]?.name || other.lane,
                    )
                    .join(", ")}
                </small>
              )}
            </span>
          </label>
        );
      })}
      {!matches.length && (
        <p>
          {candidates.length
            ? "No matching team members."
            : "Everyone on the team roster is already in this pod."}
        </p>
      )}
      {!!selectedPeople.length && <p>{selectedPeople.length} selected</p>}
    </Modal>
  );
}
