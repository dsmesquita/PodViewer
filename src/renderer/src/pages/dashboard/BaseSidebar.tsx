import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { assignments, available, podName } from "@shared/model";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton } from "@/ui/controls";
import { PersonAvatar } from "@/ui/PersonAvatar";

export default function BaseSidebar() {
  const { workspace } = useWorkspace();
  const { navigate, setBasePanel } = useShell();
  const people = available(workspace);
  const conflicted = workspace.roster
    .map((m) => ({ member: m, pods: assignments(workspace, m) }))
    .filter(({ pods }) => pods.length > 1);

  return (
    <aside className="base-sidebar" aria-labelledby="base-sidebar-title">
      <div className="sidebar-heading">
        <h2 id="base-sidebar-title">
          <button
            type="button"
            className="heading-button"
            onClick={() => setBasePanel(true)}
          >
            Base
          </button>
        </h2>
        <ActionButton
          icon="open"
          appearance="subtle"
          onClick={() => navigate({ page: "base" })}
        >
          Open page
        </ActionButton>
      </div>
      <p>Available for maintenance, preparation and a helping hand.</p>
      {conflicted.map(({ member, pods }) => (
        <MessageBar key={member.id} intent="warning" layout="multiline">
          <MessageBarBody>
            {member.name} is in{" "}
            {pods.map((p) => podName(workspace, p)).join(" and ")}. Open a pod
            and choose Keep here to resolve it.
          </MessageBarBody>
        </MessageBar>
      ))}
      <ul className="people-list">
        {people.map((m) => {
          const skills = Object.entries(workspace.levels[m.id] || {})
            .filter(([, level]) => level >= 3)
            .map(([skill]) => skill);
          return (
            <li className="person" key={m.id}>
              <PersonAvatar person={m} />
              <div>
                <strong>{m.name}</strong>
                <small>{skills.join(" · ") || "Skills not recorded"}</small>
              </div>
            </li>
          );
        })}
      </ul>
      {!workspace.roster.length ? (
        <p>Add your domain members in Settings.</p>
      ) : (
        !people.length && <p>Everyone is in a pod.</p>
      )}
    </aside>
  );
}
