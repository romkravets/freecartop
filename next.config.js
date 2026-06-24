/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose to client — safe, non-secret flag only
  env: {
    NEXT_PUBLIC_AI_ENABLED: process.env.NEXT_PUBLIC_AI_ENABLED ?? "false",
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://freecartop.vercel.app",
  },
  // Anthropic SDK uses Node.js built-ins — keep server-side only
  serverExternalPackages: ["@anthropic-ai/sdk"],
};
module.exports = nextConfig;
