import { useId, useState } from "react";
import { Tab, TabList } from "@fluentui/react-components";
import { ActionButton, IconButton } from "../ui/controls";
import Modal from "../ui/Modal";
import type { WorkspaceApp } from "../hooks/useWorkspaceApp";
import type { Person, Workspace } from "../../../shared/model";

const levels = [
  { value: 2, name: "Learning" },
  { value: 3, name: "Working" },
  { value: 4, name: "Experienced" },
];
const levelFor = (value?: number) =>
  levels.find((level) => level.value === value);

export default function SkillsPage({
  app,
}: {
  app: Pick<WorkspaceApp, "persist" | "workspace">;
}) {
  const { workspace, persist } = app;
  const [tab, setTab] = useState("members");
  const [member, setMember] = useState<Person>();
  const [catalogEdit, setCatalogEdit] = useState<{ remove?: string }>();
  const [name, setName] = useState("");
  const id = useId();
  const cleanName = name.trim();
  const duplicate = workspace.skills.some(
    (skill) => skill.toLowerCase() === cleanName.toLowerCase(),
  );
  return (
    <section className="skills">
      <TabList
        aria-label="Skills views"
        selectedValue={tab}
        onTabSelect={(_, data) => setTab(data.value as string)}
      >
        <Tab id={id + "-members"} aria-controls={id + "-panel"} value="members">
          Members
        </Tab>
        <Tab id={id + "-skills"} aria-controls={id + "-panel"} value="skills">
          Skills
        </Tab>
      </TabList>
      <div
        id={id + "-panel"}
        className="tab-content"
        role="tabpanel"
        aria-labelledby={id + "-" + tab}
      >
        {tab === "members" ? (
          workspace.roster.length ? (
            <div className="member-cards">
              {workspace.roster.map((person) => {
                const rated = workspace.skills.flatMap((skill) => {
                  const level = levelFor(workspace.levels[person.id]?.[skill]);
                  return level ? [{ skill, level }] : [];
                });
                return (
                  <article key={person.id} className="member-card">
                    <div className="member-card-heading">
                      <h3>{person.name}</h3>
                      <IconButton
                        icon="edit"
                        label={"Manage skills for " + person.name}
                        onClick={() => setMember(person)}
                      />
                    </div>
                    <div className="action-group">
                      {rated.map(({ skill, level }) => (
                        <span
                          key={skill}
                          className={`type-badge level-${level.value}`}
                          title={level.name}
                        >
                          {skill}
                          <span className="sr-only"> · {level.name}</span>
                        </span>
                      ))}
                    </div>
                    {!rated.length && <p>No skills rated.</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <p>Add team members in Settings to record their skills.</p>
          )
        ) : (
          <>
            <div className="member-card-heading">
              <div className="action-group" aria-label="Experience levels">
                {levels.map((level) => (
                  <span
                    key={level.value}
                    className={`type-badge level-${level.value}`}
                  >
                    {level.name}
                  </span>
                ))}
              </div>
              <ActionButton
                icon="add"
                label="Add skill"
                onClick={() => {
                  setName("");
                  setCatalogEdit({});
                }}
              >
                Add skill
              </ActionButton>
            </div>
            {workspace.skills.map((skill) => (
              <div className="person" key={skill}>
                <strong>{skill}</strong>
                <IconButton
                  icon="remove"
                  label={"Remove " + skill}
                  onClick={() => setCatalogEdit({ remove: skill })}
                />
              </div>
            ))}
            {!workspace.skills.length && <p>No skills in the catalog.</p>}
          </>
        )}
      </div>
      {member && (
        <MemberSkills
          key={member.id}
          member={member}
          workspace={workspace}
          onClose={() => setMember(undefined)}
          onSave={(next) => {
            persist(next);
            setMember(undefined);
          }}
        />
      )}
      {catalogEdit && (
        <Modal
          title={catalogEdit.remove ? "Remove skill" : "Add skill"}
          onClose={() => setCatalogEdit(undefined)}
          disabled={!catalogEdit.remove && (!cleanName || duplicate)}
          onSave={() => {
            if (catalogEdit.remove) {
              const skill = catalogEdit.remove;
              persist({
                ...workspace,
                skills: workspace.skills.filter((entry) => entry !== skill),
                levels: Object.fromEntries(
                  Object.entries(workspace.levels).map(([id, ratings]) => [
                    id,
                    Object.fromEntries(
                      Object.entries(ratings).filter(
                        ([entry]) => entry !== skill,
                      ),
                    ),
                  ]),
                ),
              });
            } else {
              persist({
                ...workspace,
                skills: [...workspace.skills, cleanName],
              });
            }
            setCatalogEdit(undefined);
          }}
        >
          {catalogEdit.remove ? (
            <p>Remove {catalogEdit.remove} and its member ratings?</p>
          ) : (
            <label>
              Skill name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          {!catalogEdit.remove && duplicate && (
            <p role="status">A skill with that name already exists.</p>
          )}
        </Modal>
      )}
    </section>
  );
}

function MemberSkills({
  member,
  workspace,
  onSave,
  onClose,
}: {
  member: Person;
  workspace: Workspace;
  onSave: (workspace: Workspace) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(new Map<string, number>());
  const known = workspace.levels[member.id] ?? {};
  return (
    <Modal
      title={"Manage skills for " + member.name}
      onClose={onClose}
      disabled={!draft.size}
      onSave={() => {
        const ratings = new Map(Object.entries(known));
        for (const [skill, value] of draft) {
          if (!workspace.skills.includes(skill)) continue;
          if (value === 0) ratings.delete(skill);
          else ratings.set(skill, value);
        }
        const next = Object.fromEntries(ratings);
        onSave({
          ...workspace,
          levels: { ...workspace.levels, [member.id]: next },
        });
      }}
    >
      <div className="form-stack">
        {workspace.skills.map((skill) => (
          <label key={skill}>
            {skill}
            <select
              value={draft.get(skill) ?? levelFor(known[skill])?.value ?? 0}
              onChange={(event) =>
                setDraft(new Map(draft).set(skill, Number(event.target.value)))
              }
            >
              <option value={0}>No level</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        {!workspace.skills.length && <p>Add skills in the Skills tab first.</p>}
      </div>
    </Modal>
  );
}
