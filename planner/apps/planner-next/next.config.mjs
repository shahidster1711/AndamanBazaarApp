/** @type {import('next').NextConfig} */

/**
 * next.config.mjs for Andaman Planner Pro Next.js shell.
 *
 * basePath: Set NEXT_PUBLIC_BASE_PATH=/planner in env to mount under /planner.
 * This makes the app deployable as a sub-path behind a reverse proxy.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig = {
  basePath,
  output: "standalone",
  experimental: {
    // Enables server actions and app router features
  },
  // Transpile workspace packages so TypeScript source is bundled directly
  transpilePackages: [
    "@andaman-planner/shared",
    "@andaman-planner/ui",
    "@andaman-planner/supabase",
  ],
  // Disable image optimisation restriction (all images from external domains)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Environment variables exposed to the client
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default nextConfig
