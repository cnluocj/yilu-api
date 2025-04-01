import { DifyAPIConfig, GenerateTitlesRequest, GenerateArticleRequest } from '@/types';

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
        
        // 记录请求信息
        console.log(`[${new Date().toISOString()}] 请求Dify API - 用户: ${request.openid}, 方向: ${request.direction}`);
        console.log(`[${new Date().toISOString()}] 请求Dify API - URL: ${config.baseUrl}/workflows/run`);
        console.log(`[${new Date().toISOString()}] 请求Dify API - 请求体: ${JSON.stringify(difyRequestBody)}`);
        
        // 调用Dify API
        const response = await fetch(`${config.baseUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(difyRequestBody)
        });
        
        // 记录响应状态
        console.log(`[${new Date().toISOString()}] Dify API响应状态: ${response.status} ${response.statusText}`);
        
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
        
        console.log(`[${new Date().toISOString()}] 开始处理Dify API响应流`);
        
        // 读取SSE流
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[${new Date().toISOString()}] Dify API响应流结束`);
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          const events = chunk.split('\n\n').filter(e => e.trim() !== '');
          
          // 记录接收到的原始数据块
          console.log(`[${new Date().toISOString()}] 接收Dify数据: ${chunk.replace(/\n/g, '\\n')}`);
          
          for (const event of events) {
            if (event.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(event.substring(6));
                
                // 记录事件类型
                console.log(`[${new Date().toISOString()}] 接收到Dify事件: ${eventData.event || 'unknown'}`);
                
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
                    console.log(`[${new Date().toISOString()}] 获取到workflowId: ${workflowId}`);
                  } else if (eventData.data && eventData.data.inputs && eventData.data.inputs['sys.workflow_id']) {
                    workflowId = eventData.data.inputs['sys.workflow_id'];
                    console.log(`[${new Date().toISOString()}] 从inputs获取到workflowId: ${workflowId}`);
                  } else {
                    // 如果都获取不到，使用配置的默认值
                    workflowId = config.workflowId;
                    console.log(`[${new Date().toISOString()}] 使用默认workflowId: ${workflowId}`);
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
                  
                  // 记录发送的事件
                  console.log(`[${new Date().toISOString()}] 发送开始事件: ${JSON.stringify(startEvent)}`);
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                  lastProgress = 0;
                }
                else if (eventData.event === 'node_finished') {
                  // 节点完成，增加完成步数
                  finishedSteps += 1;
                  console.log(`[${new Date().toISOString()}] 节点完成: ${finishedSteps}/${TOTAL_STEPS}`);
                  
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
                    
                    console.log(`[${new Date().toISOString()}] 发送进度更新: ${progressPercent}%`);
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'node_started') {
                  console.log(`[${new Date().toISOString()}] 节点开始`);
                  
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
                      
                      console.log(`[${new Date().toISOString()}] 发送小增量进度更新: ${newProgress}%`);
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                    }
                  }
                }
                else if (eventData.event === 'text_chunk') {
                  console.log(`[${new Date().toISOString()}] 接收到文本块`);
                  
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
                      
                      console.log(`[${new Date().toISOString()}] 发送文本块进度更新: ${newProgress}%`);
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                    }
                  }
                }
                else if (eventData.event === 'workflow_finished') {
                  console.log(`[${new Date().toISOString()}] 工作流完成`);
                  
                  // 如果在workflow_finished事件中可以获取workflowId，则更新
                  if (eventData.data && eventData.data.workflow_id && !workflowId) {
                    workflowId = eventData.data.workflow_id;
                    console.log(`[${new Date().toISOString()}] 从完成事件获取workflowId: ${workflowId}`);
                  }
                  
                  // 完成事件，解析结果
                  let result: string[] = [];
                  
                  if (eventData.data && eventData.data.outputs && eventData.data.outputs.result) {
                    // 将结果字符串按换行符分割为标题数组
                    const resultString = eventData.data.outputs.result as string;
                    result = resultString.split('\n\n').filter((title: string) => title.trim() !== '');
                    
                    // 记录结果数量和内容
                    console.log(`[${new Date().toISOString()}] 解析到${result.length}个结果标题`);
                    console.log(`[${new Date().toISOString()}] 结果内容: ${JSON.stringify(result)}`);
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
                  
                  console.log(`[${new Date().toISOString()}] 发送完成事件, 耗时: ${eventData.data?.elapsed_time || 'unknown'}`);
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                }
              } catch (e) {
                console.error(`[${new Date().toISOString()}] 解析Dify事件数据时出错:`, e);
                console.error(`[${new Date().toISOString()}] 解析失败的数据: ${event.substring(6)}`);
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error(`[${new Date().toISOString()}] 调用Dify API时出错:`, error);
        
        // 获取错误消息
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`[${new Date().toISOString()}] 错误信息: ${errorMessage}`);
        
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
 * 调用Dify API执行生成文章工作流
 */
export async function callDifyGenerateArticleAPI(
  config: DifyAPIConfig,
  request: GenerateArticleRequest
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        // 将请求参数拼接成字符串，用换行符分隔
        const msgContent = `${request.name}  ${request.unit}
方向：${request.direction}
${request.title || ''}`;
        
        // 准备请求Dify API的数据
        const difyRequestBody = {
          inputs: {
            msg: msgContent
          },
          response_mode: "streaming",
          user: request.openid // 使用openid作为用户标识
        };
        
        // 记录请求信息
        console.log(`[${new Date().toISOString()}] 请求生成文章Dify API - 方向: ${request.direction}`);
        console.log(`[${new Date().toISOString()}] 请求生成文章Dify API - URL: ${config.baseUrl}/workflows/run`);
        console.log(`[${new Date().toISOString()}] 请求生成文章Dify API - 请求体: ${JSON.stringify(difyRequestBody)}`);
        
        // 调用Dify API
        const response = await fetch(`${config.baseUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(difyRequestBody)
        });
        
        // 记录响应状态
        console.log(`[${new Date().toISOString()}] 生成文章Dify API响应状态: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          throw new Error(`生成文章Dify API 请求失败: ${response.status} ${response.statusText}`);
        }
        
        // 处理SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取生成文章Dify API响应');
        }
        
        // 进度跟踪
        const TOTAL_STEPS = 60; // 文章生成一共有60步
        let finishedSteps = 0; // 已完成的步数
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = ''; // 从Dify响应中获取的workflowId
        let lastProgress = 0; // 上次发送的进度
        
        console.log(`[${new Date().toISOString()}] 开始处理生成文章Dify API响应流`);
        
        // 读取SSE流
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[${new Date().toISOString()}] 生成文章Dify API响应流结束`);
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          const events = chunk.split('\n\n').filter(e => e.trim() !== '');
          
          // 记录接收到的原始数据块
          console.log(`[${new Date().toISOString()}] 接收生成文章Dify数据: ${chunk.replace(/\n/g, '\\n')}`);
          
          for (const event of events) {
            if (event.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(event.substring(6));
                
                // 记录事件类型
                console.log(`[${new Date().toISOString()}] 接收到生成文章Dify事件: ${eventData.event || 'unknown'}`);
                
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
                    console.log(`[${new Date().toISOString()}] 获取到生成文章workflowId: ${workflowId}`);
                  } else if (eventData.data && eventData.data.inputs && eventData.data.inputs['sys.workflow_id']) {
                    workflowId = eventData.data.inputs['sys.workflow_id'];
                    console.log(`[${new Date().toISOString()}] 从inputs获取到生成文章workflowId: ${workflowId}`);
                  } else {
                    // 如果都获取不到，使用配置的默认值
                    workflowId = config.workflowId;
                    console.log(`[${new Date().toISOString()}] 使用默认生成文章workflowId: ${workflowId}`);
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
                  
                  // 记录发送的事件
                  console.log(`[${new Date().toISOString()}] 发送生成文章开始事件: ${JSON.stringify(startEvent)}`);
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                  lastProgress = 0;
                }
                else if (eventData.event === 'node_finished') {
                  // 节点完成，增加完成步数
                  finishedSteps += 1;
                  console.log(`[${new Date().toISOString()}] 生成文章节点完成: ${finishedSteps}/${TOTAL_STEPS}`);
                  
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
                    
                    console.log(`[${new Date().toISOString()}] 发送生成文章进度更新: ${progressPercent}%`);
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'workflow_finished') {
                  console.log(`[${new Date().toISOString()}] 生成文章工作流完成`);
                  
                  // 如果在workflow_finished事件中可以获取workflowId，则更新
                  if (eventData.data && eventData.data.workflow_id && !workflowId) {
                    workflowId = eventData.data.workflow_id;
                    console.log(`[${new Date().toISOString()}] 从完成事件获取生成文章workflowId: ${workflowId}`);
                  }
                  
                  // 处理文件URL
                  let files: Array<{ url: string }> = [];
                  
                  console.log(`[${new Date().toISOString()}] 生成文章完成事件数据: ${JSON.stringify(eventData.data)}`);
                  
                  // 解析文件URL
                  if (eventData.data && eventData.data.files && Array.isArray(eventData.data.files)) {
                    // 遍历文件数组并提取URL字段
                    eventData.data.files.forEach((file: { url?: string }) => {
                      if (file && file.url) {
                        // 拼接完整URL
                        const fullUrl = `http://sandboxai.jinzhibang.com.cn${file.url}`;
                        files.push({ url: fullUrl });
                        console.log(`[${new Date().toISOString()}] 解析到生成文章文件URL: ${fullUrl}`);
                      }
                    });
                  }
                  
                  // 发送完成事件，进度设为100%
                  const finishEvent = {
                    event: "workflow_finished",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: "100",
                      files, // 使用解析的文件数组
                      elapsed_time: eventData.data?.elapsed_time?.toString() || "0",
                      status: "succeeded"
                    }
                  };
                  
                  console.log(`[${new Date().toISOString()}] 发送生成文章完成事件, 文件数: ${files.length}, 耗时: ${eventData.data?.elapsed_time || 'unknown'}`);
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                }
              } catch (e) {
                console.error(`[${new Date().toISOString()}] 解析生成文章Dify事件数据时出错:`, e);
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`[${new Date().toISOString()}] 调用生成文章Dify API时出错:`, error);
        
        // 发送错误事件
        const errorEvent = {
          event: "error",
          data: {
            message: error.message || "未知错误",
            status: "failed"
          }
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    }
  });
}

/**
 * 从环境变量中配置Dify API
 */
export function getDifyConfig(): DifyAPIConfig {
  const config = {
    apiKey: process.env.DIFY_API_KEY || '',
    baseUrl: process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn/v1',
    workflowId: process.env.DIFY_WORKFLOW_ID || '3d3925fb-af9b-4873-ba01-391524d18bbc' // 作为默认值或备用值
  };
  
  console.log(`[${new Date().toISOString()}] Dify配置: baseUrl=${config.baseUrl}, workflowId=${config.workflowId}`);
  // 不打印API密钥，以保护安全
  
  return config;
}

/**
 * 获取生成文章专用的Dify配置
 */
export function getArticleDifyConfig(): DifyAPIConfig {
  // 文章生成专用API Key
  const apiKey = process.env.ARTICLE_DIFY_API_KEY || 'app-6OQh6LGcITK6CMB1V1q9BlYQ';
  
  // 使用与标题生成相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn/v1';
  
  // 文章生成工作流ID
  const workflowId = process.env.ARTICLE_DIFY_WORKFLOW_ID || '68e14b11-c091-4499-ae78-fb77c062ad73';
  
  return {
    apiKey,
    baseUrl,
    workflowId
  };
} 