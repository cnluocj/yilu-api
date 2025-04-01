#!/bin/bash
# 实时查看Docker容器日志的脚本

# 彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Yilu API Docker 日志监控 =====${NC}"

# 确保Docker安装
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null
then
    echo -e "${RED}错误: 未安装Docker或Docker Compose${NC}"
    echo "请安装Docker和Docker Compose后再运行此脚本"
    exit 1
fi

# 检查容器是否在运行
CONTAINER_STATUS=$(docker-compose ps | grep "yilu-api" | grep "Up")

if [ -n "$CONTAINER_STATUS" ]; then
    echo -e "${GREEN}容器正在运行，开始实时监控日志...${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止监控${NC}"
    echo ""
    
    # 提供日志查看选项
    echo -e "选择日志查看选项:"
    echo -e "1) ${GREEN}实时查看所有日志${NC}"
    echo -e "2) ${GREEN}实时查看并过滤含有'Dify'的日志${NC}"
    echo -e "3) ${GREEN}实时查看并过滤含有'error'的日志${NC}"
    echo -e "4) ${GREEN}显示最近100条日志并退出${NC}"
    echo -e "请选择 [1-4]: "
    read -r LOG_OPTION
    
    case $LOG_OPTION in
        1)
            echo -e "${YELLOW}显示所有日志...${NC}"
            docker-compose logs -f --tail=100 yilu-api
            ;;
        2)
            echo -e "${YELLOW}过滤显示包含'Dify'的日志...${NC}"
            docker-compose logs -f --tail=100 yilu-api | grep -i "Dify"
            ;;
        3)
            echo -e "${YELLOW}过滤显示包含'error'的日志...${NC}"
            docker-compose logs -f --tail=100 yilu-api | grep -i "error"
            ;;
        4)
            echo -e "${YELLOW}显示最近100条日志...${NC}"
            docker-compose logs --tail=100 yilu-api
            ;;
        *)
            echo -e "${YELLOW}无效选项，默认显示所有日志...${NC}"
            docker-compose logs -f --tail=100 yilu-api
            ;;
    esac
else
    echo -e "${RED}错误: 容器未在运行!${NC}"
    echo -e "请先使用 ${GREEN}./run-docker.sh${NC} 启动容器"
    
    # 询问是否要启动容器
    echo -e "${YELLOW}是否现在启动容器? (y/n)${NC}"
    read -r START_CONTAINER
    
    if [ "$START_CONTAINER" = "y" ] || [ "$START_CONTAINER" = "Y" ]; then
        echo -e "${YELLOW}启动容器...${NC}"
        docker-compose up -d
        
        # 等待容器启动
        echo -e "${YELLOW}等待容器启动...${NC}"
        sleep 5
        
        CONTAINER_STATUS=$(docker-compose ps | grep "yilu-api" | grep "Up")
        if [ -n "$CONTAINER_STATUS" ]; then
            echo -e "${GREEN}容器已启动，显示日志...${NC}"
            docker-compose logs -f --tail=20 yilu-api
        else
            echo -e "${RED}容器启动失败，请检查错误${NC}"
            docker-compose logs yilu-api
        fi
    fi
fi 