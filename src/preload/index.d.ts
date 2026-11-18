import type { PodViewerApi } from "../shared/api";

declare global {
  interface Window {
    /** Undefined in a plain browser unless the development mock API is installed. */
    api?: PodViewerApi;
  }
}
