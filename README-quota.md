# 用户服务配额管理系统

本文档介绍如何使用和管理用户服务配额系统。

## 系统概述

配额管理系统用于限制和跟踪用户对特定服务的使用次数。当前支持的服务类型有：

- 标题生成服务 (`generate_title`)
- 文章生成服务 (`generate_article`)

## 数据库配置

1. 使用本地部署的Supabase (地址: http://ai.jinzhibang.com.cn:8000)
2. 使用`supabase-schema.sql`文件中的SQL脚本创建数据库表和权限

```bash
# 连接到Supabase SQL编辑器执行表创建
# 或者通过Supabase管理界面运行SQL
```

## 环境变量配置

在`.env.local`文件中添加以下配置：

```
# Supabase 配置
SUPABASE_URL=http://ai.jinzhibang.com.cn:8000
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTl9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# 配额API密钥
QUOTA_API_KEY=your-secure-api-key

# 用于测试环境跳过配额检查
# SKIP_QUOTA_CHECK=true
```

## API接口

### 1. 查询用户配额

```
GET /api/quota?user_id=USER_ID&service_id=SERVICE_ID
```

参数：
- `user_id`: 用户ID（必填）
- `service_id`: 服务类型，如`generate_title`或`generate_article`（必填）

返回：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": "user123",
    "service_id": "generate_article",
    "remaining_quota": 5,
    "created_at": "2023-04-07T12:00:00Z",
    "updated_at": "2023-04-07T12:00:00Z"
  }
}
```

如果用户没有配额记录，`data`将为`null`。

### 2. 添加用户配额

```
POST /api/quota
Header: x-api-key: YOUR_API_KEY
```

请求体：
```json
{
  "user_id": "user123",
  "service_id": "generate_article",
  "amount": 10
}
```

参数：
- `user_id`: 用户ID（必填）
- `service_id`: 服务类型（必填）
- `amount`: 要添加的配额数量，必须为正数（必填）

返回：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": "user123",
    "service_id": "generate_article",
    "remaining_quota": 15,
    "created_at": "2023-04-07T12:00:00Z",
    "updated_at": "2023-04-07T12:30:00Z"
  }
}
```

## 集成到现有服务

系统已集成到以下服务中：

1. 标题生成服务 (`/api/generate_titles`)
2. 文章生成服务 (`/api/generate_article`)

当用户请求这些服务时，系统会：
1. 检查用户是否有足够的配额
2. 如果配额不足，返回403错误
3. 如果配额足够，消耗一次配额并提供服务

## 开发与测试

在开发和测试环境中，可以通过设置环境变量`SKIP_QUOTA_CHECK=true`来跳过配额检查。

## 错误处理

系统会在以下情况返回错误：

1. 配额不足：HTTP 403，错误消息"服务配额不足，请联系管理员添加配额"
2. 数据库连接错误：HTTP 500，错误消息"无法连接到数据库"
3. API认证失败：HTTP 401，错误消息"API认证失败"
4. 请求参数错误：HTTP 400，附带具体错误描述 