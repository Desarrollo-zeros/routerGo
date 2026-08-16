import React from "react";
import { createRoot } from "react-dom/client";
import { initApp } from "./app/composition-root";
import { App } from "./app/router";
import { RuntimeProvider } from "./runtime/RuntimeProvider";
import { RuntimeStatusView } from "./runtime/RuntimeStatusView";
import type { RuntimeBundle } from "./runtime/bootstrap";
import { AuthView } from "./features/auth/AuthView";
import "./app/global.css";

const rootEl = document.getElementById("root")!;

type BootState = { status: "loading" } | { status: "ready"; bundle: RuntimeBundle } | { status: "error" };

function RuntimeRoot(): React.ReactElement {
  const [state, setState] = React.useState<BootState>({ status: "loading" });
  const [authenticated, setAuthenticated] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);
  const load = React.useCallback(async (forceRefresh = false) => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", bundle: await initApp(forceRefresh) });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { if (state.status !== "ready") return; void fetch("/api/auth/me", { credentials: "include" }).then((response) => setAuthenticated(response.ok)).finally(() => setAuthChecked(true)); }, [state.status]);
  if (state.status === "loading") return <RuntimeStatusView status="loading" />;
  if (state.status === "error") return <RuntimeStatusView status="error" onRetry={() => void load(true)} />;
  if (!authChecked) return <RuntimeStatusView status="loading" />;
  if (!authenticated) return <AuthView onAuthenticated={() => setAuthenticated(true)} />;
  return <RuntimeProvider bundle={state.bundle}><App /></RuntimeProvider>;
}

createRoot(rootEl).render(<RuntimeRoot />);
