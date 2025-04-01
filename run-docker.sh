#!/bin/bash
# 快速启动和测试Docker环境的脚本

# 彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Yilu API Docker 部署脚本 =====${NC}"

# 确保Docker安装
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null
then
    echo -e "${RED}错误: 未安装Docker或Docker Compose${NC}"
    echo "请安装Docker和Docker Compose后再运行此脚本"
    exit 1
fi

# 停止并删除之前的容器
echo -e "${YELLOW}停止并删除之前的容器(如果存在)...${NC}"
docker-compose down

# 构建并启动容器
echo -e "${YELLOW}构建并启动容器...${NC}"
docker-compose up -d --build

# 检查容器状态
echo -e "${YELLOW}等待容器启动...${NC}"
sleep 5
CONTAINER_STATUS=$(docker-compose ps | grep "yilu-api" | grep "Up")

if [ -n "$CONTAINER_STATUS" ]; then
    echo -e "${GREEN}容器已成功启动!${NC}"
    
    # 显示容器日志
    echo -e "${YELLOW}显示容器最近日志:${NC}"
    docker-compose logs --tail=20 yilu-api
    
    # 获取服务器IP地址
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}=== 服务已启动! ===${NC}"
    echo -e "API地址: ${GREEN}http://localhost:9090/api/generate_titles${NC}"
    echo -e "测试界面: ${GREEN}http://localhost:9090/test.html${NC}"
    
    if [ -n "$IP_ADDRESS" ]; then
        echo -e "外部访问: ${GREEN}http://$IP_ADDRESS:9090/test.html${NC}"
    fi
    
    # 简单的测试选项
    echo ""
    echo -e "${YELLOW}是否要进行API测试? (y/n)${NC}"
    read -r TEST_API
    
    if [ "$TEST_API" = "y" ] || [ "$TEST_API" = "Y" ]; then
        echo -e "${YELLOW}发送测试请求到API...${NC}"
        curl --location --request POST 'http://localhost:9090/api/generate_titles' \
        --header 'Content-Type: application/json' \
        --data-raw '{
            "openid": "wx_abcd1234efgh5678",
            "direction": "心血管疾病预防与保健",
            "word_count": 15,
            "name": "张医生",
            "unit": "北京协和医院心内科"
        }'
        echo ""
    fi
    
    echo ""
    echo -e "${GREEN}完成!${NC} 要查看容器日志，请运行: ${YELLOW}docker-compose logs -f${NC}"
else
    echo -e "${RED}错误: 容器未能成功启动${NC}"
    echo -e "${YELLOW}查看日志获取更多信息:${NC}"
    docker-compose logs yilu-api
fi 