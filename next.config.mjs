/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 端口设置已通过package.json中的命令行参数指定
  
  // 配置输出standalone模式以便Docker部署
  output: 'standalone',
};

export default nextConfig; 