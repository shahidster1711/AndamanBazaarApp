/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  transpilePackages: [
    "@andaman-planner/shared",
    "@andaman-planner/supabase-client",
    "@andaman-planner/ui",
  ],
};

module.exports = nextConfig;
