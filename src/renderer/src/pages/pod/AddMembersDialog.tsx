import { useState } from "react";
import { Checkbox, Field, SearchBox } from "@fluentui/react-components";
import {
  assignments,
  members,
  move,
  podName,
  same,
  type Pod,
  type Workspace,
} from "@shared/model";
import Modal from "@/ui/Modal";

/** Adds roster members to a pod; anyone in another pod moves out of it. */
export default function AddMembersDialog({
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
      confirmLabel="Add members"
      onSave={() =>
        onSave(
          selectedPeople.reduce(
            (next, person) => move(next, person.id, pod.id),
            workspace,
          ),
        )
      }
    >
      <Field label="Search team members">
        <SearchBox value={query} onChange={(_, d) => setQuery(d.value)} />
      </Field>
      <div className="member-choices">
        {matches.map((person) => {
          const otherPods = assignments(workspace, person);
          return (
            <Checkbox
              key={person.id}
              checked={selected.includes(person.id)}
              onChange={(_, d) =>
                setSelected(
                  d.checked
                    ? [...selected, person.id]
                    : selected.filter((x) => x !== person.id),
                )
              }
              label={
                <span className="member-choice">
                  {person.name}
                  {person.account && <small>{person.account}</small>}
                  {!!otherPods.length && (
                    <small className="warning-text">
                      Moves from{" "}
                      {otherPods
                        .map((other) => podName(workspace, other))
                        .join(", ")}
                    </small>
                  )}
                </span>
              }
            />
          );
        })}
      </div>
      {!matches.length && (
        <p>
          {candidates.length
            ? "No matching team members."
            : "Everyone on the team roster is already in this pod."}
        </p>
      )}
    </Modal>
  );
}
