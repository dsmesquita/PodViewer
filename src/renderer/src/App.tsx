import { FluentProvider } from "@fluentui/react-components";
import AppDialogs from "./app/AppDialogs";
import AppShell from "./app/AppShell";
import RouteOutlet from "./app/RouteOutlet";
import { ShellProvider } from "./hooks/useShell";
import { useThemeMode } from "./hooks/useThemeMode";
import { WorkspaceProvider } from "./hooks/useWorkspace";
import { AppToaster } from "./ui/Notifications";
import { darkTheme, lightTheme } from "./ui/theme";

export default function App() {
  const mode = useThemeMode();
  return (
    <FluentProvider theme={mode === "dark" ? darkTheme : lightTheme}>
      <div className="app-root">
        <AppToaster />
        <WorkspaceProvider>
          <ShellProvider>
            <AppShell>
              <RouteOutlet />
            </AppShell>
            <AppDialogs />
          </ShellProvider>
        </WorkspaceProvider>
      </div>
    </FluentProvider>
  );
}
