/**
 * Dify 工作流事件数据结构
 */
export interface DifyEventData {
  event: string;
  task_id?: string;
  workflow_run_id?: string;
  data?: {
    workflow_id?: string;
    progress?: string;
    status?: string;
    title?: string;
    text?: string;
    outputs?: {
      result?: string | string[];
      [key: string]: any;
    };
    inputs?: {
      [key: string]: any;
    };
    elapsed_time?: number;
    node_title?: string;
    [key: string]: any;
  };
}

/**
 * 工作流状态管理
 */
export interface WorkflowState {
  taskId: string;
  workflowRunId: string;
  workflowId: string;
  progress: number;
  finishedSteps: number;
  totalSteps: number;
}

/**
 * 进度事件配置
 */
export interface ProgressConfig {
  totalSteps: number;
  maxProgress: number; // 最大进度，通常是99，完成时设为100
  pingIncrement: number; // ping事件的进度增量
  nodeIncrement: number; // 节点完成的进度增量
  textChunkIncrement: number; // 文本块的进度增量
}

/**
 * SSE事件处理器配置
 */
export interface SSEProcessorConfig {
  progress: ProgressConfig;
  customEventHandlers?: {
    [eventType: string]: (eventData: DifyEventData, state: WorkflowState) => DifyEventData | null;
  };
  titleMapping?: Record<string, { title: string; emojiPair: string[] }>;
  enableAnimation?: boolean;
}

/**
 * 文件上传数据结构
 */
export interface FileData {
  type: string;
  transfer_method: string;
  upload_file_id: string;
  remote_url?: string;
  [key: string]: unknown;
}

/**
 * 动画管理器状态
 */
export interface AnimationState {
  lastTitle: string;
  emojiPair: string[];
  currentEmojiIndex: number;
  currentEllipsisIndex: number;
  isRunning: boolean;
}

/**
 * 工作流请求基础结构
 */
export interface BaseWorkflowRequest {
  userid: string;
}

/**
 * 错误事件数据
 */
export interface ErrorEventData {
  event: 'workflow_finished';
  task_id: string;
  workflow_run_id: string;
  data: {
    workflow_id: string;
    progress: string;
    result: string[];
    status: 'failed';
    error?: string;
  };
}