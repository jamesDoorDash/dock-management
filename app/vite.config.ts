import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      // Keep the HMR websocket pinned so a long-idle tab reconnects
      // instead of silently going stale after a restart.
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
  },
});
