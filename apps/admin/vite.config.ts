import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()], server: { proxy: { "/runtime-manifest": "http://localhost:3000" } } });
