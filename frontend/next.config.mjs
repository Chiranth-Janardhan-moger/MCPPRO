/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: '*',
        protocol: 'https',
      },
    ],
  },
  serverExternalPackages: [
    '@voltagent/core',
    '@voltagent/vercel-ai',
    '@voltagent/vercel-ui',
  ],
};

export default nextConfig;
