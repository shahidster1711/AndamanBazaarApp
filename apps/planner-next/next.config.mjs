const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const normalizedSegment = rawBasePath.replace(/^\/+|\/+$/g, "");
const basePath = normalizedSegment ? `/${normalizedSegment}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
};

if (basePath) {
  nextConfig.basePath = basePath;
  nextConfig.assetPrefix = basePath;
}

export default nextConfig;
