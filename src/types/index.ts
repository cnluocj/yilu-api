// Request Types
export interface GenerateTitlesRequest {
  openid: string;
  direction: string;
  word_count: number;
  name: string;
  unit: string;
}

// Response Types
export interface WorkflowData {
  workflow_id: string;
  progress: string;
  status: string;
  result?: string[];
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
  workflowId: string;
} 