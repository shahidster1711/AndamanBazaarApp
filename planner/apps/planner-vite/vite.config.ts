import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  optimizeDeps: {
    include: [
      "@andaman-planner/shared",
      "@andaman-planner/supabase-client",
      "@andaman-planner/ui",
    ],
  },
});
