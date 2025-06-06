# 病案总结API接口文档

## 接口概述

病案总结API提供基于AI的医疗病案图片分析和总结生成服务。用户可以上传病案相关图片（如病历、检查报告、X光片等），系统将自动分析并生成结构化的病案总结。

## 接口信息

- **接口地址**: `POST /api/generate_case_summary`
- **请求方式**: `POST`
- **内容类型**: `multipart/form-data` 或 `application/json`
- **响应格式**: `Server-Sent Events (SSE)` 流式响应

## 请求方式

### 方式一：FormData上传（Web端推荐）

**内容类型**: `multipart/form-data`

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `userid` | string | 用户唯一标识 | `wx_user123456` |
| `name` | string | 医生姓名 | `张医生` |
| `unit` | string | 科室名称 | `内科` |
| `files` | File[] | 病案图片文件（支持多文件） | 病历.jpg, 检查报告.png |

### 方式二：Base64上传（小程序推荐）

**内容类型**: `application/json`

```json
{
  "userid": "wx_user123456",
  "name": "张医生",
  "unit": "内科",
  "images": [
    {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
      "name": "病历.jpg",
      "type": "image/jpeg"
    }
  ]
}
```

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `userid` | string | 用户唯一标识 | `wx_user123456` |
| `name` | string | 医生姓名 | `张医生` |
| `unit` | string | 科室名称 | `内科` |
| `images` | Base64ImageData[] | Base64编码的图片数组 | 见下方说明 |

#### Base64ImageData 结构

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `data` | string | 是 | Base64编码的图片数据（包含data:image/xxx;base64,前缀） |
| `name` | string | 是 | 文件名 |
| `type` | string | 否 | MIME类型，默认为image/jpeg |

### 文件要求

- **支持格式**: JPG, JPEG, PNG, GIF, WebP
- **文件大小**: 建议单个文件不超过10MB
- **文件数量**: 支持多文件上传，建议不超过10个文件
- **Base64注意**: Base64编码会增加约33%的数据传输量

## 响应格式

接口采用SSE（Server-Sent Events）流式响应，实时返回处理进度和结果。

### 响应头

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Task-ID: task-1234567890-abcde
```

### SSE事件流格式

每个事件以 `data: ` 开头，后跟JSON格式的事件数据，以两个换行符结束：

```
data: {"event":"workflow_started","task_id":"xxx","data":{...}}

data: {"event":"workflow_running","task_id":"xxx","data":{...}}

data: {"event":"text_chunk","task_id":"xxx","data":{...}}

data: {"event":"workflow_finished","task_id":"xxx","data":{...}}

```

### 事件类型

#### 1. 工作流开始事件
```json
{
  "event": "workflow_started",
  "task_id": "task-1234567890-abcde",
  "workflow_run_id": "run-9876543210-fghij",
  "data": {
    "workflow_id": "workflow-123",
    "progress": "0",
    "status": "running",
    "title": "开始分析病案"
  }
}
```

#### 2. 进度更新事件
```json
{
  "event": "workflow_running",
  "task_id": "task-1234567890-abcde",
  "workflow_run_id": "run-9876543210-fghij",
  "data": {
    "workflow_id": "workflow-123",
    "progress": "45",
    "status": "running",
    "title": "分析病案图片中"
  }
}
```

#### 3. 文本生成事件
```json
{
  "event": "text_chunk",
  "task_id": "task-1234567890-abcde",
  "workflow_run_id": "run-9876543210-fghij",
  "data": {
    "text": "患者基本信息：...",
    "title": "生成病案总结中"
  }
}
```

#### 4. 完成事件（流的最后一个事件）
```json
{
  "event": "workflow_finished",
  "task_id": "task-1234567890-abcde",
  "workflow_run_id": "run-9876543210-fghij",
  "data": {
    "workflow_id": "workflow-123",
    "progress": "100",
    "status": "succeeded",
    "result": [
      "【患者基本信息】\n姓名：张三\n年龄：45岁\n性别：男\n\n【主诉】\n胸闷气短3天\n\n【现病史】\n患者3天前无明显诱因出现胸闷气短..."
    ],
    "elapsed_time": "25.6"
  }
}
```

#### 5. 错误事件
```json
{
  "event": "workflow_finished",
  "task_id": "task-1234567890-abcde",
  "workflow_run_id": "run-9876543210-fghij",
  "data": {
    "workflow_id": "workflow-123",
    "progress": "100",
    "status": "failed",
    "result": ["生成病案总结时出现错误：图片质量不清晰，无法识别文字内容"],
    "elapsed_time": "5.2"
  }
}
```

## 事件处理流程

1. **开始**: 收到 `workflow_started` 事件，开始显示进度
2. **进行中**: 收到多个 `workflow_running` 事件，更新进度条
3. **生成内容**: 收到多个 `text_chunk` 事件，实时显示生成的文本内容
4. **完成**: 收到 `workflow_finished` 事件，流结束，显示最终结果

**重要**: `workflow_finished` 事件是流的最后一个事件，收到此事件后应关闭SSE连接。

## 错误响应

### HTTP状态码错误

| 状态码 | 说明 | 响应示例 |
|--------|------|----------|
| 400 | 请求参数错误 | `{"error": "缺少必需参数: userid"}` |
| 413 | 文件过大 | `{"error": "文件大小超出限制"}` |
| 415 | 文件格式不支持 | `{"error": "不支持的文件格式"}` |
| 500 | 服务器内部错误 | `{"error": "服务器内部错误"}` |

**注意**: 测试阶段不会返回403配额不足错误。

## 配额说明

**当前处于测试阶段，病案总结功能不进行配额检查和扣除。**

正式上线后的配额规则：
- 每次成功生成病案总结会消费1次配额
- 配额不足时接口返回403状态码
- 可通过配额管理接口查询剩余配额

## 注意事项

1. **文件质量**: 上传的图片应清晰可读，模糊或低质量图片可能影响识别效果
2. **网络超时**: 病案分析可能需要20-60秒，请设置合适的超时时间
3. **并发限制**: 建议控制并发请求数量，避免同时发起多个病案分析请求
4. **结果缓存**: 建议在本地缓存分析结果，避免重复请求
5. **隐私保护**: 病案数据涉及隐私，请确保传输和存储安全
6. **SSE连接**: 收到 `workflow_finished` 事件后应主动关闭SSE连接

## 测试环境

- **测试地址**: `http://localhost:9090/api/generate_case_summary`
- **Web端测试页面**: `http://localhost:9090/test-case-summary.html`
- **小程序测试页面**: `http://localhost:9090/test-miniprogram-case-summary.html`

## 小程序集成建议

### 优势
- ✅ 支持SSE实时进度更新
- ✅ 一次请求完成所有操作
- ✅ 兼容微信小程序的网络限制
- ✅ 无需处理文件上传的复杂逻辑

### 注意事项
- ⚠️ Base64编码会增加约33%的数据传输量
- ⚠️ 大图片可能影响性能，建议压缩后上传
- ⚠️ 注意小程序的请求大小限制

### 小程序示例代码

```javascript
// 选择图片
wx.chooseImage({
  count: 9,
  sizeType: ['compressed'],
  sourceType: ['album', 'camera'],
  success: async (res) => {
    const images = [];

    // 转换为Base64
    for (const tempFilePath of res.tempFilePaths) {
      const base64 = wx.getFileSystemManager().readFileSync(tempFilePath, 'base64');
      images.push({
        data: `data:image/jpeg;base64,${base64}`,
        name: `image_${Date.now()}.jpg`,
        type: 'image/jpeg'
      });
    }

    // 发送请求
    wx.request({
      url: 'https://your-domain.com/api/generate_case_summary',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        userid: 'wx_user123',
        name: '张医生',
        unit: '内科',
        images: images
      },
      success: (res) => {
        // 处理SSE响应
        // 注意：小程序可能需要轮询或WebSocket来接收实时更新
      }
    });
  }
});
```

如有疑问或需要技术支持，请联系后端开发团队。
