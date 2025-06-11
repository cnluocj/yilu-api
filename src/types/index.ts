// Request Types
export interface GenerateTitlesRequest {
  userid: string;
  direction: string;
  word_count: number;
  name: string;
  unit: string;
}

export interface GenerateArticleRequest {
  userid: string;
  direction: string;
  word_count: number;
  name: string;
  unit: string;
  title?: string;
  style?: string; // 文章风格
  journal?: string; // 期刊
  outline?: string; // 文章大纲
}

export interface GenerateCaseSummaryRequest {
  userid: string;
  name: string;
  unit: string;
  files: any[]; // 使用any[]避免Node.js环境中File类型不存在的问题
}

// 小程序Base64图片数据
export interface Base64ImageData {
  data: string;  // Base64编码的图片数据
  name: string;  // 文件名
  type?: string; // MIME类型
}

// 小程序病案总结请求
export interface MiniProgramCaseSummaryRequest {
  userid: string;
  name: string;
  unit: string;
  images: Base64ImageData[];
}

export interface GenerateCaseTopicRequest {
  userid: string;
  summary: string;
  ext?: string;
}

export interface GenerateCaseReportRequest {
  userid: string;
  summary: string;
  title: string;
}

export interface OptimizeCaseParagraphRequest {
  userid: string;
  paragraph: string;
  article: string;
  suggestion: string;
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
  ALL = 'all',
  KP = 'kp', // 科普
  GENERATE_ARTICLE = 'generate_article',
  GENERATE_TITLE = 'generate_title',
  GENERATE_CASE_SUMMARY = 'generate_case_summary' // 病案总结
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