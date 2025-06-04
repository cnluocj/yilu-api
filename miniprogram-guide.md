# 文章生成API接口文档

本文档提供文章生成相关API的使用说明，特别是支持断点续传的API接口详情。

## 1. 文章生成接口

### 请求
```
POST /api/generate_article
Content-Type: application/json
```

### 参数
```json
{
  "userid": "用户ID",
  "direction": "健康科普",
  "title": "文章标题",
  "word_count": 1500,
  "name": "作者姓名",
  "unit": "科室名称",
  "style": "生动有趣，角度新颖"
}
```

### 响应
返回SSE事件流，Content-Type: text/event-stream

响应头中包含任务ID:
```
X-Task-ID: task-1234567890-abcde
```

事件格式:
```
data: {"event":"workflow_started","task_id":"task-1234567890-abcde","data":{"progress":"0"}}

data: {"event":"workflow_running","task_id":"task-1234567890-abcde","data":{"progress":"25","title":"读取资料中..."}}

data: {"event":"workflow_running","task_id":"task-1234567890-abcde","data":{"progress":"50","content":"这是一段生成的内容..."}}

data: {"event":"workflow_finished","task_id":"task-1234567890-abcde","data":{"progress":"100","files":[{"url":"http://example.com/files/document.docx"}]}}
```

## 2. 任务状态查询接口

### 基本状态查询
```
GET /api/article_status?task_id={taskId}&user_id={userId}
```

#### 参数
- `task_id`: 任务ID
- `user_id`: 用户ID

#### 响应
```json
{
  "id": "task-1234567890-abcde",
  "userId": "user123",
  "serviceType": "all",
  "status": "running",
  "progress": 75,
  "statusTitle": "正在撰写文章..",
  "eventCount": 150,
  "updatedAt": 1746864043148,
  "createdAt": 1746863990783
}
```

### 完整历史查询
```
GET /api/article_status?task_id={taskId}&user_id={userId}&include_history=true
```

#### 参数
- `task_id`: 任务ID
- `user_id`: 用户ID
- `include_history`: 设为true返回完整事件历史

#### 响应
包含完整的eventHistory字段:
```json
{
  "id": "task-1234567890-abcde",
  "userId": "user123",
  "serviceType": "all",
  "status": "running",
  "progress": 75,
  "statusTitle": "正在撰写文章..",
  "eventHistory": [
    {"event":"workflow_started","task_id":"task-1234567890-abcde","timestamp":1746863990783,"data":{"progress":"0"}},
    {"event":"workflow_running","task_id":"task-1234567890-abcde","timestamp":1746863995123,"data":{"progress":"25"}}
    // ... 所有历史事件
  ],
  "updatedAt": 1746864043148,
  "createdAt": 1746863990783
}
```

### 增量事件查询 (用于断点续传)
```
GET /api/article_status?task_id={taskId}&user_id={userId}&last_event_index={timestamp}
```

#### 参数
- `task_id`: 任务ID
- `user_id`: 用户ID
- `last_event_index`: 最后接收的事件时间戳

#### 响应
只返回指定时间戳之后的新事件:
```json
{
  "events": [
    {"event":"workflow_running","task_id":"task-1234567890-abcde","timestamp":1746864010123,"data":{"progress":"50"}},
    {"event":"workflow_running","task_id":"task-1234567890-abcde","timestamp":1746864020456,"data":{"progress":"75"}}
  ],
  "lastIndex": 1746864020456
}
```

## 断点续传工作流程

1. **初始生成**:
   - 调用 `POST /api/generate_article` 开始生成
   - 从响应头获取 `X-Task-ID` 并保存
   - 处理SSE事件流

2. **连接中断**:
   - 记录最后收到的事件时间戳

3. **恢复生成**:
   - 调用 `GET /api/article_status?task_id={taskId}&user_id={userId}&last_event_index={timestamp}`
   - 处理返回的新事件
   - 使用返回的 `lastIndex` 作为下次请求的 `last_event_index`

4. **定期轮询**:
   - 周期性调用增量事件查询接口获取最新事件

## 事件类型说明

| 事件类型 | 说明 | 包含字段 |
|---------|------|---------|
| workflow_started | 任务开始 | progress |
| workflow_running | 任务运行中 | progress, title, content(可选), workflow_run_id, workflow_id, status |
| text_chunk | 文本片段输出 | text, from_variable_selector, title, workflow_run_id |
| workflow_finished | 任务完成 | progress, files |
| error | 发生错误 | error |

## 实际事件示例

### workflow_running 事件
```json
{
  "event": "workflow_running",
  "task_id": "task-1746868744442-vs57s",
  "workflow_run_id": "4b44ed5d-cda4-4664-ad77-7fb1ad568e91",
  "data": {
    "workflow_id": "26887340-77f0-4494-908d-f1f26306121b",
    "progress": "21",
    "status": "running",
    "title": "🤔 拟题分析中."
  },
  "timestamp": 1746868749013
}
```

### text_chunk 事件
```json
{
  "event": "text_chunk",
  "task_id": "task-1746868744442-vs57s",
  "workflow_run_id": "4b44ed5d-cda4-4664-ad77-7fb1ad568e91",
  "data": {
    "text": "范畴，认为",
    "from_variable_selector": [
      "17458991606830",
      "text"
    ],
    "title": "文章撰写中"
  },
  "timestamp": 1746868795709
}
```

## 示例请求

### 初始生成请求
```javascript
fetch('/api/generate_article', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userid: 'user123',
    direction: '健康科普',
    title: '健康饮食指南',
    word_count: 1500,
    name: '张医生',
    unit: '营养科',
    style: '生动有趣'
  })
})
```

### 状态查询请求
```javascript
fetch('/api/article_status?task_id=task-1234567890-abcde&user_id=user123')
```

### 增量事件查询请求
```javascript
fetch('/api/article_status?task_id=task-1234567890-abcde&user_id=user123&last_event_index=1746864010123')
``` 