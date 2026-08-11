import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "RouterGo",
        short_name: "RouterGo",
        description: "Esfuerzo verificado → créditos → chat IA",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/runtime-manifest$/,
            handler: "NetworkFirst",
            options: { cacheName: "manifest", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": { target: "http://localhost:3000", rewrite: (p) => p.replace(/^\/api/, "") }, "/runtime-manifest": "http://localhost:3000" } },
});
