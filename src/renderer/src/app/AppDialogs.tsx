import {
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
} from "@fluentui/react-components";
import { edit, podName } from "@shared/model";
import { useShell } from "@/hooks/useShell";
import { useWorkspace } from "@/hooks/useWorkspace";
import BasePage from "@/pages/BasePage";
import ClosureDialog from "@/pages/pod/ClosureDialog";
import PodDetails from "@/pages/pod/PodDetails";
import { ActionButton, IconButton } from "@/ui/controls";
import TaskCreationDialog from "@/ui/TaskCreationDialog";

/** Layers above the routed page: previews, the Base panel and app-wide dialogs. */
export default function AppDialogs() {
  const shell = useShell();
  const { workspace, persist, closurePrompt, clearClosurePrompt } =
    useWorkspace();
  const preview =
    shell.route.page === "pod"
      ? undefined
      : workspace.pods.find((p) => p.id === shell.previewPodId);
  const prompted = workspace.pods.find((p) => p.id === closurePrompt);
  const closing = shell.closingPod ?? prompted;
  const size = shell.full ? "full" : "large";

  return (
    <>
      <OverlayDrawer
        position="end"
        size={size}
        open={!!preview}
        aria-label="Pod details"
        onOpenChange={(_, data) => !data.open && shell.previewPod(undefined)}
      >
        {preview && (
          <>
            <DrawerHeader>
              <DrawerHeaderTitle
                action={
                  <div className="action-group">
                    <ActionButton
                      icon="open"
                      onClick={() =>
                        shell.navigate({ page: "pod", id: preview.id })
                      }
                    >
                      Open page
                    </ActionButton>
                    <IconButton
                      label={shell.full ? "Restore" : "Full screen"}
                      icon={shell.full ? "restore" : "expand"}
                      onClick={() => shell.setFull(!shell.full)}
                    />
                    <ActionButton onClick={() => shell.previewPod(undefined)}>
                      Close
                    </ActionButton>
                  </div>
                }
              >
                {podName(workspace, preview)}
              </DrawerHeaderTitle>
            </DrawerHeader>
            <DrawerBody>
              <PodDetails key={preview.id} pod={preview} drawer />
            </DrawerBody>
          </>
        )}
      </OverlayDrawer>
      <OverlayDrawer
        position="end"
        size={size}
        open={shell.basePanel}
        aria-label="Base"
        onOpenChange={(_, data) => shell.setBasePanel(data.open)}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <div className="action-group">
                <ActionButton
                  icon="open"
                  onClick={() => shell.navigate({ page: "base" })}
                >
                  Open page
                </ActionButton>
                <IconButton
                  label={shell.full ? "Restore" : "Full screen"}
                  icon={shell.full ? "restore" : "expand"}
                  onClick={() => shell.setFull(!shell.full)}
                />
                <ActionButton onClick={() => shell.setBasePanel(false)}>
                  Close Base
                </ActionButton>
              </div>
            }
          >
            Base
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <BasePage drawer />
        </DrawerBody>
      </OverlayDrawer>
      {shell.taskTarget && (
        <TaskCreationDialog
          key={shell.taskTarget.id}
          item={shell.taskTarget}
          workspace={workspace}
          onClose={() => shell.createTasks(undefined)}
        />
      )}
      {closing && (
        <ClosureDialog
          key={closing.id}
          name={podName(workspace, closing)}
          start={workspace.overrides[closing.id]?.start || closing.created}
          prompted={!shell.closingPod}
          onClose={() => {
            // Declining a prompt dismisses it until the Feature changes state again.
            if (!shell.closingPod)
              persist(edit(workspace, closing.id, { dismissed: true }));
            shell.closePod(undefined);
            clearClosurePrompt();
          }}
          onSave={(date) => {
            persist(edit(workspace, closing.id, { closed: date }));
            shell.closePod(undefined);
            clearClosurePrompt();
          }}
        />
      )}
    </>
  );
}
