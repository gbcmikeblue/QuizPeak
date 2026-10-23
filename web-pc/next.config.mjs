/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@quizpeak/shared'],
  eslint: { ignoreDuringBuilds: true },
  // 容器化部署：产出 .next/standalone，镜像体积更小
  output: 'standalone',
};

export default nextConfig;
