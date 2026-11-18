import {
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Toast,
  Toaster,
  ToastTitle,
  useToastController,
} from "@fluentui/react-components";
import { useCallback } from "react";
import { IconButton, StatusIcon } from "./controls";

const toasterId = "app-toaster";

/** Toasts render in a live region, so success notices reach assistive technology. */
export function AppToaster() {
  return <Toaster toasterId={toasterId} position="bottom-end" />;
}

export function useNotify() {
  const { dispatchToast } = useToastController(toasterId);
  return useCallback(
    (message: string, intent: "success" | "info" | "warning" = "success") =>
      dispatchToast(
        <Toast>
          <ToastTitle>{message}</ToastTitle>
        </Toast>,
        { intent, timeout: 4000 },
      ),
    [dispatchToast],
  );
}

/** A persistent, dismissible error. Long text is clamped; the status icon shows all of it. */
export function ErrorBar({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div className="app-messages" role="alert">
      <MessageBar intent="error" layout="multiline">
        <MessageBarBody className="clamped">{message}</MessageBarBody>
        <MessageBarActions
          containerAction={
            <IconButton
              icon="close"
              label="Dismiss error"
              onClick={onDismiss}
            />
          }
        >
          {message.length > 200 && (
            <StatusIcon kind="error" message={message} />
          )}
        </MessageBarActions>
      </MessageBar>
    </div>
  );
}
