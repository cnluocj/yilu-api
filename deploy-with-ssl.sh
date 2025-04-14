#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

DOMAIN="sandboxai.jinzhibang.com.cn"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Yilu API 服务部署脚本 (带SSL)  ${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "${YELLOW}将为域名 ${DOMAIN} 配置SSL证书${NC}"
echo -e "${YELLOW}管理后台将通过 https://${DOMAIN}/admin 访问${NC}"

# 拉取最新镜像
echo -e "${YELLOW}拉取最新Docker镜像...${NC}"
docker-compose pull

# 启动服务
echo -e "${YELLOW}启动服务...${NC}"
docker-compose down
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查Caddy是否正常运行
if docker-compose ps | grep -q "caddy.*Up"; then
  echo -e "${GREEN}Caddy服务已成功启动!${NC}"
else
  echo -e "${RED}Caddy服务可能未正常启动，请检查日志:${NC}"
  docker-compose logs caddy
fi

# 检查API服务是否正常运行
if docker-compose ps | grep -q "yilu-api.*Up"; then
  echo -e "${GREEN}Yilu API服务已成功启动!${NC}"
else
  echo -e "${RED}Yilu API服务可能未正常启动，请检查日志:${NC}"
  docker-compose logs yilu-api
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成!  ${NC}"
echo -e "${GREEN}您的服务应该已经可以通过以下地址访问:${NC}"
echo -e "${GREEN}管理后台: https://${DOMAIN}/admin${NC}"
echo -e "${GREEN}API服务: https://${DOMAIN}/api${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}如果遇到问题，可以使用以下命令查看日志:${NC}"
echo -e "docker-compose logs caddy"
echo -e "docker-compose logs yilu-api" 