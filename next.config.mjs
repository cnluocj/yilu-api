/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 生产构建时忽略ESLint错误
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  // 端口设置已通过package.json中的命令行参数指定
  
  // 配置输出standalone模式以便Docker部署
  output: 'standalone',
};

export default nextConfig; 