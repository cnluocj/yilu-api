import { ServiceType } from '@/types';

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// SSE事件类型
export interface SSEEvent {
  event: string;
  task_id?: string;
  workflow_run_id?: string;
  data?: {
    workflow_id?: string;
    progress?: string;
    status?: string;
    title?: string;
    content?: string;
    files?: Array<{url: string}>;
    elapsed_time?: string;
    error?: string;
    [key: string]: any;
  };
  timestamp: number;
}

// 任务信息接口
export interface TaskInfo {
  id: string;
  userId: string;
  serviceType: ServiceType;
  status: TaskStatus;
  progress: number;
  result?: {
    fileUrl?: string;
    error?: string;
  };
  statusTitle?: string;        // 当前状态标题
  currentContent?: string;     // 当前已生成内容
  eventHistory: SSEEvent[];    // 事件历史记录
  lastEventIndex: number;      // 客户端最后消费的事件索引
  createdAt: number;
  updatedAt: number;
}

// 简易内存存储 (生产环境应该使用Redis或数据库)
const taskStore: Map<string, TaskInfo> = new Map();

// 任务清理间隔 (24小时)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

// 任务过期时间 (48小时)
const TASK_EXPIRY = 48 * 60 * 60 * 1000;

// 定期清理过期任务
setInterval(() => {
  const now = Date.now();
  for (const [key, task] of taskStore.entries()) {
    if (now - task.updatedAt > TASK_EXPIRY) {
      taskStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

// 创建新任务
export async function createTask(userId: string, serviceType: ServiceType): Promise<TaskInfo> {
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  
  const taskInfo: TaskInfo = {
    id: taskId,
    userId,
    serviceType,
    status: TaskStatus.PENDING,
    progress: 0,
    eventHistory: [], // 初始化事件历史记录
    lastEventIndex: -1, // 初始化最后消费的事件索引
    createdAt: now,
    updatedAt: now
  };
  
  const key = `${userId}:${taskId}`;
  taskStore.set(key, taskInfo);
  
  return taskInfo;
}

// 更新任务状态
export async function updateTaskStatus(
  userId: string, 
  taskId: string, 
  updates: Partial<Omit<TaskInfo, 'id' | 'userId' | 'createdAt' | 'eventHistory'>>
): Promise<TaskInfo | null> {
  const key = `${userId}:${taskId}`;
  const task = taskStore.get(key);
  
  if (!task) {
    return null;
  }
  
  const updatedTask = {
    ...task,
    ...updates,
    updatedAt: Date.now()
  };
  
  taskStore.set(key, updatedTask);
  return updatedTask;
}

// 添加新的SSE事件
export async function addTaskEvent(
  userId: string,
  taskId: string,
  sseEvent: Omit<SSEEvent, 'timestamp'>
): Promise<TaskInfo | null> {
  const key = `${userId}:${taskId}`;
  const task = taskStore.get(key);
  
  if (!task) {
    return null;
  }
  
  // 创建完整事件对象
  const completeEvent: SSEEvent = {
    ...sseEvent,
    timestamp: Date.now()
  };
  
  // 更新任务状态和内容
  let updates: Partial<TaskInfo> = {
    updatedAt: Date.now()
  };
  
  // 追加事件到历史记录
  const updatedHistory = [...task.eventHistory, completeEvent];
  
  // 基于事件类型更新任务状态
  if (sseEvent.event === 'workflow_started') {
    updates.status = TaskStatus.RUNNING;
    updates.progress = parseInt(sseEvent.data?.progress || '0');
    if (sseEvent.data?.title) {
      updates.statusTitle = sseEvent.data.title;
    }
  } 
  else if (sseEvent.event === 'workflow_running') {
    updates.status = TaskStatus.RUNNING;
    updates.progress = parseInt(sseEvent.data?.progress || '0');
    if (sseEvent.data?.title) {
      updates.statusTitle = sseEvent.data.title;
    }
    // 如果有内容更新，追加到当前内容
    if (sseEvent.data?.content) {
      updates.currentContent = (task.currentContent || '') + sseEvent.data.content;
    }
  } 
  else if (sseEvent.event === 'workflow_finished') {
    updates.status = TaskStatus.COMPLETED;
    updates.progress = 100;
    
    if (sseEvent.data?.files && sseEvent.data.files.length > 0) {
      updates.result = {
        fileUrl: sseEvent.data.files[0]?.url || ''
      };
    } else if (sseEvent.data?.error) {
      updates.status = TaskStatus.FAILED;
      updates.result = {
        error: sseEvent.data.error
      };
    }
  } 
  else if (sseEvent.event === 'error') {
    updates.status = TaskStatus.FAILED;
    updates.result = {
      error: sseEvent.data?.error || '未知错误'
    };
  }
  
  // 更新任务
  const updatedTask = {
    ...task,
    ...updates,
    eventHistory: updatedHistory
  };
  
  taskStore.set(key, updatedTask);
  return updatedTask;
}

// 获取任务状态
export async function getUserTaskStatus(userId: string, taskId: string): Promise<TaskInfo | null> {
  const key = `${userId}:${taskId}`;
  return taskStore.get(key) || null;
}

// 获取新事件 (指定起始索引，用于断点续传)
export async function getNewTaskEvents(
  userId: string, 
  taskId: string, 
  fromIndex: number
): Promise<{events: SSEEvent[], lastIndex: number} | null> {
  console.log(`[${new Date().toISOString()}] 获取新事件: 用户=${userId}, 任务=${taskId}, 从索引=${fromIndex}`);
  
  const key = `${userId}:${taskId}`;
  const task = taskStore.get(key);
  
  if (!task) {
    console.log(`[${new Date().toISOString()}] 任务不存在: ${taskId}`);
    return null;
  }
  
  // 确保索引是数字类型
  const fromIndexNum = Number(fromIndex);
  
  console.log(`[${new Date().toISOString()}] 历史事件总数: ${task.eventHistory.length}`);
  
  // 使用数组索引而不是时间戳来确定新事件
  let newEvents: SSEEvent[] = [];
  
  // 如果是初始请求(索引为0或-1)，返回所有事件
  if (fromIndexNum <= 0) {
    console.log(`[${new Date().toISOString()}] 初始请求，返回所有事件`);
    newEvents = [...task.eventHistory];
  } else {
    // 查找事件索引位置
    const eventIndex = task.eventHistory.findIndex(event => event.timestamp === fromIndexNum);
    console.log(`[${new Date().toISOString()}] 查找时间戳 ${fromIndexNum} 的事件，索引位置: ${eventIndex}`);
    
    if (eventIndex >= 0) {
      // 找到了精确匹配的事件，返回之后的所有事件
      newEvents = task.eventHistory.slice(eventIndex + 1);
      console.log(`[${new Date().toISOString()}] 精确匹配后的新事件数量: ${newEvents.length}`);
    } else {
      // 没有精确匹配，尝试按时间顺序找到所有更新的事件
      newEvents = task.eventHistory.filter(event => event.timestamp > fromIndexNum);
      console.log(`[${new Date().toISOString()}] 时间戳比较后的新事件数量: ${newEvents.length}`);
    }
  }
  
  // 找出最新事件的时间戳作为lastIndex
  const lastIndex = newEvents.length > 0 
    ? Math.max(...newEvents.map(event => event.timestamp))
    : (task.eventHistory.length > 0 
        ? Math.max(...task.eventHistory.map(event => event.timestamp)) 
        : fromIndexNum);
  
  console.log(`[${new Date().toISOString()}] 返回 ${newEvents.length} 个新事件，lastIndex=${lastIndex}`);
  
  // 临时增加调试信息，打印事件内容
  if (newEvents.length > 0) {
    for (let i = 0; i < Math.min(newEvents.length, 3); i++) {
      console.log(`[${new Date().toISOString()}] 事件示例 ${i}: 类型=${newEvents[i].event}, 时间戳=${newEvents[i].timestamp}`);
    }
  }
  
  return {
    events: newEvents,
    lastIndex: lastIndex
  };
}

// 获取用户所有任务
export async function getUserTasks(userId: string): Promise<TaskInfo[]> {
  const userTasks: TaskInfo[] = [];
  
  for (const [key, task] of taskStore.entries()) {
    if (key.startsWith(`${userId}:`)) {
      userTasks.push(task);
    }
  }
  
  return userTasks;
} 