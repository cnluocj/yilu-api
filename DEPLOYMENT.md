# Yilu API 部署指南

本文档介绍如何使用Docker和Docker Compose部署Yilu API服务。

## 前置条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

## 部署步骤

### 1. 配置环境变量（可选）

如果需要自定义配置，可以创建`.env`文件，设置以下环境变量:

```
DIFY_API_KEY=your_dify_api_key
DIFY_BASE_URL=http://your-dify-api-url/v1
DIFY_WORKFLOW_ID=your_workflow_id
USE_MOCK_DATA=false
```

如果不创建`.env`文件，将使用docker-compose.yml中的默认值。

### 2. 构建并启动服务

在项目根目录下运行:

```bash
# 构建并启动容器（后台运行）
docker-compose up -d

# 查看容器运行状态
docker-compose ps

# 查看容器日志
docker-compose logs -f
```

服务将在端口9090上启动。可以通过访问 http://your-server-ip:9090 来访问服务。

### 3. 测试API

使用curl或其他工具测试API:

```bash
curl --location --request POST 'http://localhost:9090/api/generate_titles' \
--header 'Content-Type: application/json' \
--data-raw '{
    "openid": "wx_abcd1234efgh5678",
    "direction": "心血管疾病预防与保健",
    "word_count": 15,
    "name": "张医生",
    "unit": "北京协和医院心内科"
}'
```

或者通过浏览器访问 http://localhost:9090/test.html 使用web界面测试。

### 4. 管理容器

```bash
# 停止服务
docker-compose down

# 停止并删除相关卷
docker-compose down -v

# 重启服务
docker-compose restart
```

## 生产环境部署建议

1. **使用HTTPS**: 在生产环境中，建议使用HTTPS保护API通信。可以在前端使用Nginx作为反向代理并配置SSL。

2. **资源限制**: 在生产环境中，应该为容器设置资源限制，避免单个服务占用过多系统资源:

```yaml
services:
  yilu-api:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

3. **日志管理**: 配置外部日志管理服务，如ELK或Loki:

```yaml
services:
  yilu-api:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

4. **监控**: 集成Prometheus等监控工具，监控服务健康状况。

## 故障排除

1. **容器无法启动**:
   - 检查日志: `docker-compose logs yilu-api`
   - 确保端口9090未被其他服务占用

2. **API返回错误**:
   - 检查环境变量，特别是DIFY_API_KEY和DIFY_BASE_URL是否正确
   - 确认Dify服务可访问

3. **性能问题**:
   - 检查容器资源使用情况: `docker stats`
   - 考虑增加资源限制或优化应用代码 