import { DifyAPIConfig, GenerateTitlesRequest } from '@/types';

/**
 * 调用Dify API执行工作流
 */
export async function callDifyWorkflowAPI(
  config: DifyAPIConfig,
  request: GenerateTitlesRequest
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        // 准备请求Dify API的数据
        const difyRequestBody = {
          inputs: {
            direction: request.direction
          },
          response_mode: "streaming",
          user: request.openid // 使用openid作为用户标识
        };
        
        // 调用Dify API
        const response = await fetch(`${config.baseUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(difyRequestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Dify API 请求失败: ${response.status} ${response.statusText}`);
        }
        
        // 处理SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取Dify API响应');
        }
        
        // 进度跟踪
        const TOTAL_STEPS = 6; // 默认总步数为6步
        let finishedSteps = 0; // 已完成的步数
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = ''; // 从Dify响应中获取的workflowId
        let lastProgress = 0; // 上次发送的进度
        
        // 读取SSE流
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const events = chunk.split('\n\n').filter(e => e.trim() !== '');
          
          for (const event of events) {
            if (event.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(event.substring(6));
                
                // 提取task_id和workflow_run_id（如果存在）
                if (eventData.task_id) {
                  lastTaskId = eventData.task_id;
                }
                if (eventData.workflow_run_id) {
                  lastWorkflowRunId = eventData.workflow_run_id;
                }
                
                // 根据事件类型处理
                if (eventData.event === 'workflow_started') {
                  // 从workflow_started事件中提取workflowId
                  if (eventData.data && eventData.data.workflow_id) {
                    workflowId = eventData.data.workflow_id;
                  } else if (eventData.data && eventData.data.inputs && eventData.data.inputs['sys.workflow_id']) {
                    workflowId = eventData.data.inputs['sys.workflow_id'];
                  } else {
                    // 如果都获取不到，使用配置的默认值
                    workflowId = config.workflowId;
                  }
                  
                  // 发送workflow_started事件
                  const startEvent = {
                    event: "workflow_started",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: "0",
                      status: "running"
                    }
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                  lastProgress = 0;
                }
                else if (eventData.event === 'node_finished') {
                  // 节点完成，增加完成步数
                  finishedSteps += 1;
                  
                  // 计算进度百分比（最多到99%）
                  const progressPercent = Math.min(Math.floor((finishedSteps / TOTAL_STEPS) * 100), 99);
                  
                  // 只有当进度有变化时才发送更新
                  if (progressPercent > lastProgress) {
                    lastProgress = progressPercent;
                    const progressEvent = {
                      event: "workflow_running",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        workflow_id: workflowId,
                        progress: progressPercent.toString(),
                        status: "running"
                      }
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'node_started') {
                  // 节点开始事件，可以考虑发送进度，但不增加完成步数
                  // 如果当前进度接近100但还未完成，可以降低进度变化速度
                  if (lastProgress >= 90 && lastProgress < 99) {
                    // 进度接近100%时，进度增长变慢
                    const smallIncrement = 1;
                    const newProgress = Math.min(lastProgress + smallIncrement, 99);
                    
                    if (newProgress > lastProgress) {
                      lastProgress = newProgress;
                      const progressEvent = {
                        event: "workflow_running",
                        task_id: lastTaskId,
                        workflow_run_id: lastWorkflowRunId,
                        data: {
                          workflow_id: workflowId,
                          progress: newProgress.toString(),
                          status: "running"
                        }
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                    }
                  }
                }
                else if (eventData.event === 'text_chunk') {
                  // 文本块事件，可以考虑在低进度时发送进度更新
                  if (lastProgress < 90) {
                    // 如果进度较低，可以缓慢增加进度
                    const smallIncrement = 2;
                    const newProgress = Math.min(lastProgress + smallIncrement, 90);
                    
                    if (newProgress > lastProgress) {
                      lastProgress = newProgress;
                      const progressEvent = {
                        event: "workflow_running",
                        task_id: lastTaskId,
                        workflow_run_id: lastWorkflowRunId,
                        data: {
                          workflow_id: workflowId,
                          progress: newProgress.toString(),
                          status: "running"
                        }
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                    }
                  }
                }
                else if (eventData.event === 'workflow_finished') {
                  // 如果在workflow_finished事件中可以获取workflowId，则更新
                  if (eventData.data && eventData.data.workflow_id && !workflowId) {
                    workflowId = eventData.data.workflow_id;
                  }
                  
                  // 完成事件，解析结果
                  let result: string[] = [];
                  
                  if (eventData.data && eventData.data.outputs && eventData.data.outputs.result) {
                    // 将结果字符串按换行符分割为标题数组
                    const resultString = eventData.data.outputs.result as string;
                    result = resultString.split('\n\n').filter((title: string) => title.trim() !== '');
                  }
                  
                  // 发送完成事件，进度设为100%
                  const finishEvent = {
                    event: "workflow_finished",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: "100",
                      result,
                      elapsed_time: eventData.data?.elapsed_time?.toString() || "0",
                      status: "succeeded"
                    }
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                }
              } catch (e) {
                console.error('解析Dify事件数据时出错:', e);
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error('调用Dify API时出错:', error);
        
        // 获取错误消息
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        
        // 发送错误事件
        const errorEvent = {
          event: "workflow_finished",
          task_id: "error-" + Date.now(),
          workflow_run_id: "error-" + Date.now(),
          data: {
            workflow_id: config.workflowId, // 错误情况下使用配置的workflowId
            progress: "100",
            result: [`调用Dify API时出错: ${errorMessage}`],
            status: "failed"
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      }
      
      controller.close();
    }
  });
}

/**
 * 从环境变量中配置Dify API
 */
export function getDifyConfig(): DifyAPIConfig {
  return {
    apiKey: process.env.DIFY_API_KEY || '',
    baseUrl: process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn/v1',
    workflowId: process.env.DIFY_WORKFLOW_ID || '3d3925fb-af9b-4873-ba01-391524d18bbc' // 作为默认值或备用值
  };
} 