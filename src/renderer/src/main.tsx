import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";

async function start() {
  if (import.meta.env.DEV && !window.api)
    (await import("./dev/installMockApi")).installMockApi();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
