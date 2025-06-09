#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 配置
IMAGE_NAME="cnluocj/yilu-api"
COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="yilu-api"
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}🚀 Yilu API 部署脚本${NC}"
    echo ""
    echo "用法: $0 [选项] [标签]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -f, --force    强制重新部署，不进行确认"
    echo "  -b, --backup   部署前备份当前镜像"
    echo "  -l, --logs     部署后显示日志"
    echo "  -s, --status   仅显示当前状态"
    echo ""
    echo "示例:"
    echo "  $0                    # 部署latest版本"
    echo "  $0 v1.2.3            # 部署指定版本"
    echo "  $0 -b -l             # 备份并部署，显示日志"
    echo "  $0 -f latest         # 强制部署latest版本"
}

# 显示当前状态
show_status() {
    echo -e "${BLUE}📊 当前服务状态:${NC}"
    sudo docker compose ps
    echo ""
    echo -e "${BLUE}📦 当前镜像信息:${NC}"
    sudo docker images $IMAGE_NAME
}

# 备份当前镜像
backup_current_image() {
    echo -e "${YELLOW}💾 备份当前镜像为 $IMAGE_NAME:$BACKUP_TAG...${NC}"
    
    # 获取当前运行的镜像ID
    CURRENT_IMAGE_ID=$(sudo docker inspect $SERVICE_NAME --format='{{.Image}}' 2>/dev/null)
    
    if [ -n "$CURRENT_IMAGE_ID" ]; then
        sudo docker tag $CURRENT_IMAGE_ID $IMAGE_NAME:$BACKUP_TAG
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 镜像备份成功: $IMAGE_NAME:$BACKUP_TAG${NC}"
        else
            echo -e "${RED}❌ 镜像备份失败${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  未找到当前运行的镜像，跳过备份${NC}"
    fi
}

# 清理旧的备份镜像（保留最近5个）
cleanup_old_backups() {
    echo -e "${YELLOW}🧹 清理旧的备份镜像...${NC}"
    
    # 获取所有备份镜像，按时间排序，删除超过5个的旧备份
    OLD_BACKUPS=$(sudo docker images $IMAGE_NAME --format "table {{.Tag}}" | grep "backup-" | tail -n +6)
    
    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while read tag; do
            echo -e "${YELLOW}删除旧备份: $IMAGE_NAME:$tag${NC}"
            sudo docker rmi $IMAGE_NAME:$tag 2>/dev/null
        done
    fi
}

# 健康检查
health_check() {
    echo -e "${YELLOW}🏥 进行健康检查...${NC}"
    
    # 等待服务启动
    sleep 10
    
    # 检查容器是否运行
    if sudo docker compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ 容器运行正常${NC}"
        
        # 尝试访问健康检查端点（如果有的话）
        # curl -f http://localhost:9090/api/health 2>/dev/null
        # if [ $? -eq 0 ]; then
        #     echo -e "${GREEN}✅ 服务健康检查通过${NC}"
        # else
        #     echo -e "${YELLOW}⚠️  服务健康检查失败，但容器正在运行${NC}"
        # fi
    else
        echo -e "${RED}❌ 容器启动失败${NC}"
        return 1
    fi
}

# 主要部署函数
deploy() {
    local tag=${1:-"latest"}
    local force=${2:-false}
    local backup=${3:-false}
    local show_logs=${4:-false}
    
    echo -e "${BLUE}🚀 开始部署 ${IMAGE_NAME}:${tag}...${NC}"
    
    # 检查docker-compose.yml是否存在
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}❌ 错误: $COMPOSE_FILE 文件不存在${NC}"
        exit 1
    fi
    
    # 确认部署
    if [ "$force" != true ]; then
        echo -e "${YELLOW}⚠️  即将重新部署服务，这将导致短暂的服务中断${NC}"
        read -p "确认继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}❌ 部署已取消${NC}"
            exit 0
        fi
    fi
    
    # 备份当前镜像
    if [ "$backup" = true ]; then
        backup_current_image
        cleanup_old_backups
    fi
    
    # 停止服务
    echo -e "${YELLOW}📦 停止服务...${NC}"
    sudo docker compose down
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 服务已停止${NC}"
    else
        echo -e "${RED}❌ 停止服务失败${NC}"
        exit 1
    fi
    
    # 删除旧镜像
    echo -e "${YELLOW}🗑️  删除旧镜像...${NC}"
    sudo docker rmi $IMAGE_NAME:$tag 2>/dev/null
    
    # 拉取新镜像
    echo -e "${YELLOW}📥 拉取镜像 $IMAGE_NAME:$tag...${NC}"
    sudo docker pull $IMAGE_NAME:$tag
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 镜像拉取成功${NC}"
    else
        echo -e "${RED}❌ 拉取镜像失败${NC}"
        exit 1
    fi
    
    # 启动服务
    echo -e "${YELLOW}🚀 启动服务...${NC}"
    sudo docker compose up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 服务启动成功${NC}"
    else
        echo -e "${RED}❌ 服务启动失败${NC}"
        exit 1
    fi
    
    # 健康检查
    health_check
    
    # 显示状态
    show_status
    
    # 显示日志
    if [ "$show_logs" = true ]; then
        echo -e "${YELLOW}📋 显示最近的日志...${NC}"
        sudo docker compose logs --tail=30 $SERVICE_NAME
    fi
    
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo -e "${BLUE}💡 提示:${NC}"
    echo -e "  - 查看实时日志: ${PURPLE}sudo docker compose logs -f $SERVICE_NAME${NC}"
    echo -e "  - 查看服务状态: ${PURPLE}sudo docker compose ps${NC}"
    echo -e "  - 重启服务: ${PURPLE}sudo docker compose restart $SERVICE_NAME${NC}"
}

# 解析命令行参数
FORCE=false
BACKUP=false
SHOW_LOGS=false
TAG="latest"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -b|--backup)
            BACKUP=true
            shift
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -s|--status)
            show_status
            exit 0
            ;;
        -*)
            echo -e "${RED}❌ 未知选项: $1${NC}"
            show_help
            exit 1
            ;;
        *)
            TAG=$1
            shift
            ;;
    esac
done

# 执行部署
deploy $TAG $FORCE $BACKUP $SHOW_LOGS
