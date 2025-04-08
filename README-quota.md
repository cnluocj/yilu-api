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

# JWT配置
JWT_SECRET=your-very-secure-jwt-secret-key-for-yilu-api-quota-management
JWT_EXPIRY=1h

# 配额API密钥
QUOTA_API_KEY=your-secure-api-key

# 用于测试环境跳过配额检查
# SKIP_QUOTA_CHECK=true
```

## 认证系统（JWT）

本系统使用JWT（JSON Web Tokens）进行用户认证和授权。

### 用户角色

系统定义了三种用户角色：

- `admin` - 管理员角色，拥有所有权限
- `system` - 系统服务角色，用于内部服务间通信
- `customer` - 普通用户角色，权限受限

### 权限系统

JWT令牌中包含权限列表，用于控制用户访问权限：

- `quota:read` - 允许查询配额
- `quota:write` - 允许添加配额
- `quota:delete` - 允许删除配额（仅管理员）
- `user:manage` - 允许管理用户（仅管理员）

不同角色默认拥有的权限：
- 管理员：`quota:read`, `quota:write`, `quota:delete`, `user:manage`
- 系统服务：`quota:read`, `quota:write`
- 普通用户：`quota:read`

### JWT接口

#### 1. 生成JWT令牌

```
POST /api/jwt/generate
```

请求体：
```json
{
  "userId": "user123",
  "role": "customer",
  "expiresIn": "3600s"
}
```

参数：
- `userId`: 用户ID（必填）
- `role`: 用户角色，可选值为 `admin`, `system`, `customer`（必填）
- `expiresIn`: 令牌有效期，格式为时间加单位，如 `3600s`, `24h`, `7d`（可选，默认1小时）

返回：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1681141288
}
```

#### 2. 验证JWT令牌

```
POST /api/jwt/verify
```

请求体：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

返回：
```json
{
  "valid": true,
  "payload": {
    "userId": "user123",
    "role": "customer",
    "permissions": ["quota:read"],
    "iat": 1681137688,
    "exp": 1681141288
  }
}
```

## 配额API接口

配额API接口支持两种认证方式：
1. JWT认证（推荐用于用户操作）
2. API密钥认证（用于管理操作）

### 1. 查询用户配额

```
GET /api/quota?user_id=USER_ID&service_id=SERVICE_ID
Header: Authorization: Bearer YOUR_JWT_TOKEN
```

参数：
- `user_id`: 用户ID（必填）
- `service_id`: 服务类型，如`generate_title`或`generate_article`（必填）

注意：
- 普通用户(customer)只能查询自己的配额
- 管理员(admin)和系统服务(system)可以查询任何用户的配额

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
Header: Authorization: Bearer YOUR_JWT_TOKEN
```

或者使用API密钥：

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

注意：
- 普通用户(customer)只能为自己添加配额
- 管理员(admin)和系统服务(system)可以为任何用户添加配额

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

系统提供了测试页面，可通过`/test-unified.html`访问，包含以下功能：
1. 生成文章 - 测试文章生成服务
2. 生成标题 - 测试标题生成服务
3. 配额管理 - 测试配额查询和添加功能
4. JWT测试 - 测试JWT令牌生成和验证

## 错误处理

系统会在以下情况返回错误：

1. 配额不足：HTTP 403，错误消息"服务配额不足，请联系管理员添加配额"
2. 数据库连接错误：HTTP 500，错误消息"无法连接到数据库"
3. 认证失败：HTTP 401，错误消息"无效的授权令牌"或"API认证失败"
4. 权限不足：HTTP 403，错误消息"权限不足"
5. 请求参数错误：HTTP 400，附带具体错误描述

## 安全说明

- 在生产环境中，必须使用安全的JWT密钥和API密钥
- JWT令牌默认有效期为1小时，可通过`JWT_EXPIRY`环境变量调整
- 普通用户的权限受限，只能操作自己的配额数据
- 所有接口调用都会记录日志，便于排查问题 