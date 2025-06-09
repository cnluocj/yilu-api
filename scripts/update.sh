#!/bin/bash

# 一键更新脚本 - 最简单版本
echo "🚀 正在更新 yilu-api 服务..."

# 停止服务
echo "📦 停止服务..."
sudo docker compose down

# 删除旧镜像
echo "🗑️ 删除旧镜像..."
sudo docker rmi cnluocj/yilu-api:latest 2>/dev/null || true

# 拉取最新镜像并启动
echo "📥 拉取最新镜像并启动服务..."
sudo docker compose up -d

# 显示状态
echo "📊 服务状态:"
sudo docker compose ps

echo "✅ 更新完成！"
echo "💡 查看日志: sudo docker compose logs -f yilu-api"
