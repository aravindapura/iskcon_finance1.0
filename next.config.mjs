import nextI18NextConfig from "./next-i18next.config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...nextI18NextConfig,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
