# Yilu API 部署管理 Makefile

# 配置变量
IMAGE_NAME = cnluocj/yilu-api
SERVICE_NAME = yilu-api
COMPOSE_FILE = docker-compose.yml

# 颜色定义
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m

.PHONY: help status logs update deploy stop start restart clean backup

# 默认目标
help:
	@echo "$(BLUE)🚀 Yilu API 部署管理命令$(NC)"
	@echo ""
	@echo "$(YELLOW)部署命令:$(NC)"
	@echo "  make update     - ⚡ 快速更新（开发/测试环境，无确认）"
	@echo "  make deploy     - 🏭 生产部署（包含确认、备份、健康检查）"
	@echo ""
	@echo "$(YELLOW)监控命令:$(NC)"
	@echo "  make status     - 📊 查看服务状态"
	@echo "  make logs       - 📋 查看服务日志"
	@echo ""
	@echo "$(YELLOW)服务控制:$(NC)"
	@echo "  make start      - 启动服务"
	@echo "  make stop       - 停止服务"
	@echo "  make restart    - 重启服务"
	@echo ""
	@echo "$(YELLOW)维护命令:$(NC)"
	@echo "  make clean      - 🧹 清理未使用的镜像"
	@echo "  make backup     - 💾 备份当前镜像"
	@echo "  make rollback   - ⏪ 回滚到最近的备份"
	@echo ""
	@echo "$(YELLOW)示例:$(NC)"
	@echo "  make update     # 最常用，快速更新"
	@echo "  make logs       # 查看实时日志"

# 快速更新（开发/测试环境）
update:
	@echo "$(BLUE)⚡ 快速更新模式 - 无确认，适合开发环境$(NC)"
	@echo "$(YELLOW)📦 停止服务...$(NC)"
	@sudo docker compose down
	@echo "$(YELLOW)🗑️ 删除旧镜像...$(NC)"
	@sudo docker rmi $(IMAGE_NAME):latest 2>/dev/null || true
	@echo "$(YELLOW)📥 拉取最新镜像并启动...$(NC)"
	@sudo docker compose up -d
	@echo "$(GREEN)✅ 快速更新完成！$(NC)"
	@echo "$(BLUE)📊 当前状态:$(NC)"
	@sudo docker compose ps

# 完整部署流程（生产环境）
deploy:
	@echo "$(BLUE)🏭 生产部署模式 - 包含确认、备份、健康检查$(NC)"
	@echo "$(YELLOW)⚠️ 即将重新部署服务，这将导致短暂的服务中断$(NC)"
	@read -p "确认继续? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(YELLOW)� 备份当前镜像...$(NC)"
	@make backup
	@echo "$(YELLOW)�📦 停止并删除容器...$(NC)"
	@sudo docker compose down
	@echo "$(YELLOW)🗑️ 删除旧镜像...$(NC)"
	@sudo docker rmi $(IMAGE_NAME):latest 2>/dev/null || true
	@echo "$(YELLOW)📥 拉取最新镜像...$(NC)"
	@sudo docker pull $(IMAGE_NAME):latest
	@echo "$(YELLOW)🚀 启动服务...$(NC)"
	@sudo docker compose up -d
	@echo "$(YELLOW)⏳ 等待服务启动并进行健康检查...$(NC)"
	@sleep 10
	@echo "$(BLUE)🏥 健康检查:$(NC)"
	@if sudo docker compose ps | grep -q "Up"; then \
		echo "$(GREEN)✅ 服务运行正常$(NC)"; \
	else \
		echo "$(RED)❌ 服务启动异常$(NC)"; \
		sudo docker compose logs --tail=20 $(SERVICE_NAME); \
		exit 1; \
	fi
	@echo "$(GREEN)🎉 生产部署完成！$(NC)"
	@make status
	@echo "$(BLUE)📋 最近日志:$(NC)"
	@sudo docker compose logs --tail=20 $(SERVICE_NAME)

# 查看服务状态
status:
	@echo "$(BLUE)📊 服务状态:$(NC)"
	@sudo docker compose ps
	@echo ""
	@echo "$(BLUE)📦 镜像信息:$(NC)"
	@sudo docker images $(IMAGE_NAME)

# 查看日志
logs:
	@echo "$(BLUE)📋 显示最近30条日志:$(NC)"
	@sudo docker compose logs --tail=30 $(SERVICE_NAME)
	@echo ""
	@echo "$(YELLOW)💡 查看实时日志: make logs-follow$(NC)"

# 实时日志
logs-follow:
	@echo "$(BLUE)📋 实时日志 (Ctrl+C 退出):$(NC)"
	@sudo docker compose logs -f $(SERVICE_NAME)

# 启动服务
start:
	@echo "$(YELLOW)🚀 启动服务...$(NC)"
	@sudo docker compose up -d
	@make status

# 停止服务
stop:
	@echo "$(YELLOW)📦 停止服务...$(NC)"
	@sudo docker compose down
	@echo "$(GREEN)✅ 服务已停止$(NC)"

# 重启服务
restart:
	@echo "$(YELLOW)🔄 重启服务...$(NC)"
	@sudo docker compose restart $(SERVICE_NAME)
	@make status

# 清理未使用的镜像
clean:
	@echo "$(YELLOW)🧹 清理未使用的Docker镜像...$(NC)"
	@sudo docker image prune -f
	@echo "$(GREEN)✅ 清理完成$(NC)"

# 备份当前镜像
backup:
	@echo "$(YELLOW)💾 备份当前镜像...$(NC)"
	@BACKUP_TAG="backup-$$(date +%Y%m%d-%H%M%S)" && \
	CURRENT_IMAGE_ID=$$(sudo docker inspect $(SERVICE_NAME) --format='{{.Image}}' 2>/dev/null) && \
	if [ -n "$$CURRENT_IMAGE_ID" ]; then \
		sudo docker tag $$CURRENT_IMAGE_ID $(IMAGE_NAME):$$BACKUP_TAG && \
		echo "$(GREEN)✅ 镜像备份成功: $(IMAGE_NAME):$$BACKUP_TAG$(NC)"; \
	else \
		echo "$(RED)❌ 未找到当前运行的镜像$(NC)"; \
	fi

# 回滚到最近的备份
rollback:
	@echo "$(YELLOW)⏪ 查找最近的备份镜像...$(NC)"
	@LATEST_BACKUP=$$(sudo docker images $(IMAGE_NAME) --format "table {{.Tag}}" | grep "backup-" | head -n 1) && \
	if [ -n "$$LATEST_BACKUP" ]; then \
		echo "$(BLUE)找到备份镜像: $(IMAGE_NAME):$$LATEST_BACKUP$(NC)" && \
		echo "$(YELLOW)⚠️ 即将回滚到备份版本，这将导致短暂的服务中断$(NC)" && \
		read -p "确认回滚? (y/N): " confirm && [ "$$confirm" = "y" ] && \
		echo "$(YELLOW)📦 停止当前服务...$(NC)" && \
		sudo docker compose down && \
		echo "$(YELLOW)🔄 切换到备份镜像...$(NC)" && \
		sudo docker tag $(IMAGE_NAME):$$LATEST_BACKUP $(IMAGE_NAME):latest && \
		echo "$(YELLOW)🚀 启动服务...$(NC)" && \
		sudo docker compose up -d && \
		echo "$(GREEN)✅ 回滚完成！$(NC)" && \
		make status; \
	else \
		echo "$(RED)❌ 未找到备份镜像$(NC)"; \
	fi

# 强制重新构建（开发用）
rebuild:
	@echo "$(YELLOW)🔨 强制重新构建...$(NC)"
	@sudo docker compose down
	@sudo docker compose build --no-cache
	@sudo docker compose up -d
	@make status

# 查看资源使用情况
stats:
	@echo "$(BLUE)📈 容器资源使用情况:$(NC)"
	@sudo docker stats $(SERVICE_NAME) --no-stream

# 进入容器
shell:
	@echo "$(BLUE)🐚 进入容器 shell:$(NC)"
	@sudo docker compose exec $(SERVICE_NAME) /bin/sh

# 检查健康状态
health:
	@echo "$(BLUE)🏥 检查服务健康状态:$(NC)"
	@sudo docker compose ps
	@echo ""
	@echo "$(BLUE)📊 容器详细信息:$(NC)"
	@sudo docker inspect $(SERVICE_NAME) --format='{{.State.Status}}: {{.State.Health.Status}}' 2>/dev/null || echo "健康检查未配置"
