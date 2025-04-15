// Request Types
export interface GenerateTitlesRequest {
  openid: string;
  direction: string;
  word_count: number;
  name: string;
  unit: string;
}

export interface GenerateArticleRequest {
  openid: string;
  direction: string;
  word_count: number;
  name: string;
  unit: string;
  title?: string;
  style?: string; // 文章风格
}

// Response Types
export interface WorkflowData {
  workflow_id: string;
  progress: string;
  status: string;
  result?: string[];
  files?: Array<{ url: string }>;
  elapsed_time?: string;
}

export interface WorkflowEvent {
  event: 'workflow_started' | 'workflow_running' | 'workflow_finished';
  task_id: string;
  workflow_run_id: string;
  data: WorkflowData;
}

// Helper Types for future Dify integration
export interface DifyAPIConfig {
  apiKey: string;
  baseUrl: string;
  apiUrl: string;
}

// 用户服务配额相关类型
export interface UserServiceQuota {
  id?: number;
  user_id: string;
  service_id: ServiceType;
  remaining_quota: number;
  created_at?: string;
  updated_at?: string;
}

// 服务类型枚举
export enum ServiceType {
  KP = 'kp', // 科普
  GENERATE_ARTICLE = 'generate_article',
  GENERATE_TITLE = 'generate_title'
}

// 添加服务配额请求
export interface AddQuotaRequest {
  user_id: string;
  service_id: ServiceType;
  amount: number;
}

// API响应标准格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 