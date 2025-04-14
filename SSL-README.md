# Yilu API SSL配置说明

本文档介绍了使用Caddy为Yilu API服务添加SSL的配置和使用方法。

## 概述

我们使用Caddy作为反向代理服务器，为Yilu API服务提供自动的SSL证书管理。Caddy的主要优势：

- 自动申请、安装和续期Let's Encrypt SSL证书
- 简单的配置语法
- 高性能的HTTP/2和HTTP/3支持
- 内置的安全功能

## 配置结构

配置包含以下文件：

1. **docker-compose.yml**: Docker Compose配置文件，包含Yilu API和Caddy服务
2. **Caddyfile**: Caddy服务器配置文件
3. **deploy-with-ssl.sh**: 部署脚本

## 路径规划

所有URL路径规划如下：

- **`/admin/*`**: 管理后台路径，包含所有测试页面
- **`/api/*`**: API服务端点
- **`/`**: 根路径，重定向到管理后台

例如：
- 管理后台页面: `https://sandboxai.jinzhibang.com.cn/admin`
- 测试统一页面: `https://sandboxai.jinzhibang.com.cn/admin/test-unified.html`
- API服务: `https://sandboxai.jinzhibang.com.cn/api/generate_titles`

## 部署方法

在服务器上执行以下步骤：

1. 将项目文件上传到服务器
2. 确保Docker和Docker Compose已安装
3. 进入项目目录
4. 运行部署脚本：

```bash
chmod +x deploy-with-ssl.sh
./deploy-with-ssl.sh
```

## 工作原理

1. Caddy在端口80和443上接收请求
2. 自动申请并管理SSL证书
3. 根据路径规则将请求转发到Yilu API服务
4. 为所有连接提供HTTPS加密

## 日志和故障排查

- Caddy日志位于容器内的`/var/log/caddy/access.log`
- 可以通过以下命令查看日志：
  ```bash
  docker-compose logs caddy
  docker-compose logs yilu-api
  ```

## 证书续期

Caddy会自动处理证书的续期，您无需任何手动操作。

## 常见问题

**问题：如何更改域名？**

修改`Caddyfile`文件中的域名，然后重启Caddy：

```bash
docker-compose restart caddy
```

**问题：如何添加新的路径或服务？**

编辑`Caddyfile`，添加新的`handle`块。例如：

```
handle /newpath/* {
    reverse_proxy new-service:8080
}
```

**问题：SSL证书未正确申请？**

确保:
1. 域名正确指向服务器IP
2. 80和443端口可从互联网访问
3. 检查Caddy日志查看详细错误信息

## 安全考虑

1. Caddy默认添加了一些安全响应头
2. 所有HTTP请求会自动重定向到HTTPS
3. 使用了HSTS头，确保浏览器总是使用HTTPS连接

## 更新与维护

如需更新配置：

1. 编辑相应的配置文件
2. 重启服务：
   ```bash
   docker-compose restart
   ```

如需更新服务：

```bash
docker-compose pull
docker-compose up -d
``` 