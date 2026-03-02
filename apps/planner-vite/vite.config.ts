import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@planner/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@planner/shared/": path.resolve(__dirname, "../../packages/shared/src/"),
      "@planner/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@planner/ui/": path.resolve(__dirname, "../../packages/ui/src/"),
    },
  },
});
