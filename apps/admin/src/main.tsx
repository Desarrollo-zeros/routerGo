import React from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "./app/AdminApp";
import { HttpRuntimeManifestClient } from "./runtime/AdminManifestClient";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("admin_root_missing");
const container = root;
async function start(): Promise<void> {
  try {
    const manifest = await new HttpRuntimeManifestClient().read();
    createRoot(container).render(<React.StrictMode><AdminApp manifest={manifest} /></React.StrictMode>);
  } catch {
    createRoot(container).render(<React.StrictMode><AdminApp /></React.StrictMode>);
  }
}

void start();
