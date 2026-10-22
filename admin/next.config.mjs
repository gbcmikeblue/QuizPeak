/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quizpeak/shared'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
