import ConnectionSection from "./ConnectionSection";
import DiagnosticsSection from "./DiagnosticsSection";
import FieldMappingSection from "./FieldMappingSection";
import ScopeSection from "./ScopeSection";
import TaskTemplatesSection from "./TaskTemplatesSection";
import TeamSection from "./TeamSection";
import WorkspaceSection from "./WorkspaceSection";

/** Board setup in the order it is done, beside the roster and workspace housekeeping. */
export default function SettingsPage() {
  return (
    <div className="settings">
      <div className="settings-column">
        <ConnectionSection />
        <ScopeSection />
        <FieldMappingSection />
        <TaskTemplatesSection />
      </div>
      <div className="settings-column">
        <TeamSection />
        <DiagnosticsSection />
        <WorkspaceSection />
      </div>
    </div>
  );
}
