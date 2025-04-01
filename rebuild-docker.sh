#!/bin/bash
# 重建Docker容器脚本

# 彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== 重建 Yilu API Docker 容器 =====${NC}"

# 停止并删除现有容器
echo -e "${YELLOW}停止并删除现有容器...${NC}"
docker compose down

# 重新构建映像
echo -e "${YELLOW}清理旧的Docker缓存...${NC}"
docker builder prune -f

# 构建新镜像
echo -e "${YELLOW}构建新镜像...${NC}"
docker compose build --no-cache

# 启动容器
echo -e "${YELLOW}启动新容器...${NC}"
docker compose up -d

# 显示日志
echo -e "${YELLOW}显示日志...${NC}"
docker compose logs -f 