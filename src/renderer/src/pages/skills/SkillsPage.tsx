import { useId, useState } from "react";
import { Field, Input, Tab, TabList } from "@fluentui/react-components";
import type { Person } from "@shared/model";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ActionButton, IconButton } from "@/ui/controls";
import Modal from "@/ui/Modal";
import { PersonAvatar } from "@/ui/PersonAvatar";
import { levelFor, levels } from "./levels";
import MemberSkillsDialog from "./MemberSkillsDialog";

function LevelLegend() {
  return (
    <ul className="chip-list" aria-label="Experience levels">
      {levels.map((level) => (
        <li key={level.value} className={`type-badge level-${level.value}`}>
          {level.name}
        </li>
      ))}
    </ul>
  );
}

export default function SkillsPage() {
  const { workspace, persist } = useWorkspace();
  const [tab, setTab] = useState("members");
  const [member, setMember] = useState<Person>();
  const [catalogEdit, setCatalogEdit] = useState<{ remove?: string }>();
  const [name, setName] = useState("");
  const id = useId();
  const cleanName = name.trim();
  const duplicate = workspace.skills.some(
    (skill) => skill.toLowerCase() === cleanName.toLowerCase(),
  );

  function removeSkill(skill: string) {
    persist({
      ...workspace,
      skills: workspace.skills.filter((entry) => entry !== skill),
      levels: Object.fromEntries(
        Object.entries(workspace.levels).map(([personId, ratings]) => [
          personId,
          Object.fromEntries(
            Object.entries(ratings).filter(([entry]) => entry !== skill),
          ),
        ]),
      ),
    });
  }

  return (
    <section className="skills">
      <div className="section-heading">
        <TabList
          aria-label="Skills views"
          selectedValue={tab}
          onTabSelect={(_, data) => setTab(data.value as string)}
        >
          <Tab
            id={id + "-members"}
            aria-controls={id + "-panel"}
            value="members"
          >
            Members
          </Tab>
          <Tab id={id + "-skills"} aria-controls={id + "-panel"} value="skills">
            Skills
          </Tab>
        </TabList>
        <LevelLegend />
      </div>
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
                      <PersonAvatar person={person} size={32} />
                      <h3>{person.name}</h3>
                      <IconButton
                        icon="edit"
                        label={"Manage skills for " + person.name}
                        onClick={() => setMember(person)}
                      />
                    </div>
                    {rated.length ? (
                      <ul className="chip-list">
                        {rated.map(({ skill, level }) => (
                          <li
                            key={skill}
                            className={`type-badge level-${level.value}`}
                            title={level.name}
                          >
                            {skill}
                            <span className="sr-only"> · {level.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No skills rated.</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p>Add team members in Settings to record their skills.</p>
          )
        ) : (
          <>
            <div className="action-group">
              <ActionButton
                icon="add"
                onClick={() => {
                  setName("");
                  setCatalogEdit({});
                }}
              >
                Add skill
              </ActionButton>
            </div>
            <ul className="people-list">
              {workspace.skills.map((skill) => (
                <li className="person" key={skill}>
                  <strong>{skill}</strong>
                  <small>
                    {
                      Object.values(workspace.levels).filter((ratings) =>
                        levelFor(ratings[skill]),
                      ).length
                    }{" "}
                    rated
                  </small>
                  <IconButton
                    icon="remove"
                    label={"Remove " + skill}
                    onClick={() => setCatalogEdit({ remove: skill })}
                  />
                </li>
              ))}
            </ul>
            {!workspace.skills.length && <p>No skills in the catalog.</p>}
          </>
        )}
      </div>
      {member && (
        <MemberSkillsDialog
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
      {catalogEdit?.remove ? (
        <Modal
          title="Remove skill"
          confirmLabel="Remove"
          destructive
          onClose={() => setCatalogEdit(undefined)}
          onSave={() => {
            removeSkill(catalogEdit.remove!);
            setCatalogEdit(undefined);
          }}
        >
          <p>Remove {catalogEdit.remove} and its member ratings?</p>
        </Modal>
      ) : (
        catalogEdit && (
          <Modal
            title="Add skill"
            onClose={() => setCatalogEdit(undefined)}
            disabled={!cleanName || duplicate}
            onSave={() => {
              persist({
                ...workspace,
                skills: [...workspace.skills, cleanName],
              });
              setCatalogEdit(undefined);
            }}
          >
            <Field
              label="Skill name"
              validationState={duplicate ? "error" : "none"}
              validationMessage={
                duplicate ? "A skill with that name already exists." : undefined
              }
            >
              <Input value={name} onChange={(_, d) => setName(d.value)} />
            </Field>
          </Modal>
        )
      )}
    </section>
  );
}
