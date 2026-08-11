import React from "react";
import { createRoot } from "react-dom/client";
import { initApp } from "./app/composition-root";
import { App } from "./app/router";
import { injectFallbackTokens } from "./design-system/tokens";
import "./app/global.css";

const rootEl = document.getElementById("root")!;

function Fallback({ error, retry }: { error: string; retry: () => void }): React.ReactElement {
  return (
    <div style={{ padding: 24, background: "#0a0a0f", color: "#f2f2f7", minHeight: "100dvh" }}>
      <h1 style={{ fontSize: 18 }}>RouterGo — sin conexión</h1>
      <p style={{ color: "#a1a1b5" }}>{error}</p>
      <button onClick={retry} style={{ minHeight: 44, padding: "10px 18px", borderRadius: 999, border: 0, background: "#7c5cff", color: "#fff", fontWeight: 700 }}>Reintentar</button>
    </div>
  );
}

async function mount(): Promise<void> {
  injectFallbackTokens();
  try {
    const bundle = await initApp();
    createRoot(rootEl).render(<App bundle={bundle} />);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const retry = () => location.reload();
    createRoot(rootEl).render(<Fallback error={msg} retry={retry} />);
  }
}

void mount();
