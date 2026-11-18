import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import BasePage from "@/pages/BasePage";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import FeaturePage from "@/pages/FeaturePage";
import OverviewPage from "@/pages/OverviewPage";
import PodDetails from "@/pages/pod/PodDetails";
import SettingsPage from "@/pages/settings/SettingsPage";
import SkillsPage from "@/pages/skills/SkillsPage";
import TimelinePage from "@/pages/TimelinePage";
import { ActionButton, Loading } from "@/ui/controls";
import { PageToolbar } from "@/ui/PageToolbar";
import { navLabels, type NavPage } from "./routes";

function Missing({ what, back }: { what: string; back: NavPage }) {
  const { navigate } = useShell();
  return (
    <div className="empty">
      <h2>{what} is not in this workspace.</h2>
      <p>It may have left the board, or its link is out of date.</p>
      <ActionButton
        appearance="primary"
        onClick={() => navigate({ page: back })}
      >
        Go to {navLabels[back]}
      </ActionButton>
    </div>
  );
}

export default function RouteOutlet() {
  const { route, dashboard } = useShell();
  const { workspace, loaded } = useWorkspace();
  if (!loaded) return <Loading label="Loading workspace…" />;
  switch (route.page) {
    case "overview":
      return (
        <DashboardLayout>
          <OverviewPage />
        </DashboardLayout>
      );
    case "timeline":
      return (
        <DashboardLayout>
          <TimelinePage />
        </DashboardLayout>
      );
    case "base":
      return <BasePage />;
    case "skills":
      return <SkillsPage />;
    case "settings":
      return <SettingsPage />;
    case "feature": {
      const item = workspace.baseItems.find((i) => i.id === route.id);
      return item ? (
        <FeaturePage key={item.id} item={item} />
      ) : (
        <>
          <PageToolbar />
          <Missing what={`Feature #${route.id}`} back="base" />
        </>
      );
    }
    case "pod": {
      const pod = workspace.pods.find((p) => p.id === route.id);
      return pod ? (
        <PodDetails key={pod.id} pod={pod} />
      ) : (
        <>
          <PageToolbar />
          <Missing what="This pod" back={dashboard} />
        </>
      );
    }
  }
}
