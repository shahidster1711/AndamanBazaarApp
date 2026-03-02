import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite config for the Andaman Planner Pro demo harness.
 *
 * basePath can be set via VITE_BASE_PATH env var to test sub-path deployment.
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@andaman-planner/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@andaman-planner/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@andaman-planner/supabase": path.resolve(__dirname, "../../packages/supabase/src/index.ts"),
    },
  },
})
