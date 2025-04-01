# Yilu API

Next.js API服务，用于转发请求到Dify服务。

## 项目结构

```
/src
  /app
    /api
      /generate_titles - 生成标题的API端点
  /types
    /index.ts - TypeScript类型定义
  /utils
    /dify.ts - Dify API集成工具
```

## API端点

### `POST /generate_titles`

根据输入参数生成内容标题。

**请求格式:**

```json
{
  "openid": "wx_abcd1234efgh5678",
  "direction": "心血管疾病预防与保健",
  "word_count": 15,
  "name": "张医生",
  "unit": "北京协和医院心内科"
}
```

**响应:**

服务器发送事件(SSE)流，包含进度更新和最终结果。

## 开发

1. 克隆项目并安装依赖：

```bash
# 安装依赖
npm install
```

2. 配置环境变量，创建`.env.local`文件：

```
# Dify API配置
DIFY_API_KEY=your_dify_api_key_here
DIFY_BASE_URL=http://sandboxai.jinzhibang.com.cn/v1
DIFY_WORKFLOW_ID=your_workflow_id_here

# 应用设置
NODE_ENV=development
# 设置为true使用模拟数据，false使用实际Dify API
USE_MOCK_DATA=false
```

3. 启动开发服务器：

```bash
npm run dev
```

服务器将在 http://localhost:9090 上可用。

## 当前实现

API现在支持将请求转发到Dify服务。将`USE_MOCK_DATA`环境变量设置为`true`可以使用模拟数据进行开发和测试。

### 测试接口

1. 浏览器测试：访问 http://localhost:9090/test.html
2. 命令行测试：运行 `node test-api.mjs`
