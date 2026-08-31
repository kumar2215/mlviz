import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    base: process.env.VITE_BASE_PATH || "/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        // The app is developed from a Windows-mounted path in WSL. Native file
        // events are unreliable there, so polling is required for Vite to see
        // source changes and send HMR updates.
        watch: {
            usePolling: true,
            interval: 250,
        },
        // Only use proxy in development mode
        proxy:
            mode === "development"
                ? {
                      // Proxying requests that start with /api
                      "/api": {
                          target: "http://127.0.0.1:8000",
                          changeOrigin: true,
                      },
                  }
                : undefined,
    },
}));
