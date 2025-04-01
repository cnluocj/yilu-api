import { DifyAPIConfig, GenerateTitlesRequest, WorkflowEvent } from '@/types';

/**
 * Utility function for future integration with Dify API
 * Currently a placeholder for the actual implementation
 */
export async function callDifyWorkflowAPI(
  config: DifyAPIConfig,
  request: GenerateTitlesRequest
): Promise<ReadableStream<Uint8Array>> {
  // This is a placeholder for the actual implementation
  // In the future, this will make requests to the Dify API
  
  // Mock implementation for now
  const encoder = new TextEncoder();
  
  // Create a mock stream that would eventually be replaced with the real Dify API call
  return new ReadableStream({
    async start(controller) {
      // For now, implement a simple mock to match our test data
      // This will be replaced with actual API calls in the future
      
      // Sample workflow started event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        event: "workflow_started",
        task_id: "task-" + Date.now(),
        workflow_run_id: "run-" + Date.now(),
        data: {
          workflow_id: config.workflowId,
          progress: "0",
          status: "running"
        }
      })}\n\n`));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sample progress events
      for (let progress of ["30", "60", "90"]) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          event: "workflow_running",
          task_id: "task-" + Date.now(),
          workflow_run_id: "run-" + Date.now(),
          data: {
            workflow_id: config.workflowId,
            progress,
            status: "running"
          }
        })}\n\n`));
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Sample completion event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        event: "workflow_finished",
        task_id: "task-" + Date.now(),
        workflow_run_id: "run-" + Date.now(),
        data: {
          workflow_id: config.workflowId,
          progress: "100",
          result: [
            `${request.direction}：关键要点与最新进展`,
            `${request.direction}：专家指南与临床实践`,
            `${request.direction}：风险评估与预防策略`,
            `${request.direction}：患者教育与自我管理`,
            `${request.direction}：研究前沿与未来展望`
          ],
          elapsed_time: "3.5",
          status: "succeeded"
        }
      })}\n\n`));
      
      controller.close();
    }
  });
}

/**
 * Configure the Dify API from environment variables
 */
export function getDifyConfig(): DifyAPIConfig {
  return {
    apiKey: process.env.DIFY_API_KEY || '',
    baseUrl: process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1',
    workflowId: process.env.DIFY_WORKFLOW_ID || ''
  };
} 