# 病案拟题API接口文档

## 接口概述

病案拟题API基于病案总结内容，自动生成相关的医学题目。该接口接收病案总结文本，通过AI分析生成多种类型的医学题目，包括选择题、问答题等。

## 接口信息

- **接口地址**: `POST /api/generate_case_topic`
- **请求方式**: `POST`
- **内容类型**: `application/json`
- **响应格式**: `Server-Sent Events (SSE)` 流式响应

## 请求参数

### 必需参数

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `userid` | string | 用户唯一标识 | `wx_user123456` |
| `summary` | string | 病案总结内容 | `【患者基本信息】姓名：张三...` |

### 参数要求

- **userid**: 不能为空，用于标识用户
- **summary**: 不能为空，应包含完整的病案总结信息

## 请求示例

```json
{
  "userid": "wx_user123456",
  "summary": "【患者基本信息】姓名：张三，年龄：45岁，性别：男【主诉】胸闷气短3天【现病史】患者3天前无明显诱因出现胸闷气短，活动后加重，伴有心悸，无胸痛、咳嗽、咳痰等症状。【既往史】高血压病史5年，规律服用降压药物。【体格检查】血压150/90mmHg，心率95次/分，心律齐，双肺呼吸音清，无干湿性啰音。【辅助检查】心电图示：窦性心律，ST段轻度压低。【诊断】1.冠心病？2.高血压病【治疗建议】1.进一步完善冠脉造影检查2.调整降压药物3.低盐低脂饮食4.适当运动"
}
```

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
    "title": "开始生成题目"
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
    "title": "生成题目中"
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
    "text": "1. 根据患者的主诉和症状，最可能的诊断是：\nA. 急性心肌梗死\nB. 冠心病\nC. 心律失常\nD. 肺栓塞\n\n",
    "title": "生成题目中"
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
      "1. 根据患者的主诉和症状，最可能的诊断是：\nA. 急性心肌梗死\nB. 冠心病\nC. 心律失常\nD. 肺栓塞\n\n2. 患者的心电图检查结果提示：\nA. 正常心电图\nB. ST段轻度压低\nC. T波倒置\nD. Q波异常\n\n3. 针对该患者，下列哪项检查最有助于明确诊断：\nA. 胸部X线\nB. 冠脉造影\nC. 超声心动图\nD. 24小时动态心电图"
    ],
    "elapsed_time": "15.3"
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
    "result": ["生成题目时出现错误：病案总结内容不完整，无法生成有效题目"],
    "elapsed_time": "3.2"
  }
}
```

## 事件处理流程

1. **开始**: 收到 `workflow_started` 事件，开始显示进度
2. **进行中**: 收到多个 `workflow_running` 事件，更新进度条
3. **生成内容**: 收到多个 `text_chunk` 事件，实时显示生成的题目内容
4. **完成**: 收到 `workflow_finished` 事件，流结束，显示最终结果

**重要**: `workflow_finished` 事件是流的最后一个事件，收到此事件后应关闭SSE连接。

## 错误响应

### HTTP状态码错误

| 状态码 | 说明 | 响应示例 |
|--------|------|----------|
| 400 | 请求参数错误 | `{"error": "缺少必需参数: summary"}` |
| 413 | 内容过长 | `{"error": "病案总结内容过长"}` |
| 500 | 服务器内部错误 | `{"error": "服务器内部错误"}` |

**注意**: 测试阶段不会返回403配额不足错误。

## 配额说明

**当前处于测试阶段，病案拟题功能不进行配额检查和扣除。**

正式上线后的配额规则：
- 每次成功生成题目会消费1次配额
- 配额不足时接口返回403状态码
- 可通过配额管理接口查询剩余配额

## 注意事项

1. **内容质量**: 病案总结应包含完整的患者信息、症状、检查结果等，内容越详细，生成的题目质量越高
2. **网络超时**: 题目生成可能需要10-30秒，请设置合适的超时时间
3. **并发限制**: 建议控制并发请求数量，避免同时发起多个题目生成请求
4. **结果缓存**: 建议在本地缓存生成结果，避免重复请求
5. **SSE连接**: 收到 `workflow_finished` 事件后应主动关闭SSE连接

## 测试环境

- **测试地址**: `http://localhost:9090/api/generate_case_topic`
- **测试页面**: `http://localhost:9090/test-case-question.html`

如有疑问或需要技术支持，请联系后端开发团队。
