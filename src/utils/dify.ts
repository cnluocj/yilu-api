import { DifyAPIConfig, GenerateTitlesRequest, GenerateArticleRequest, GenerateCaseSummaryRequest, GenerateCaseTopicRequest, GenerateCaseReportRequest } from '@/types';

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
          user: request.userid
        };
        
        // 记录请求信息
        console.log(`[${new Date().toISOString()}] 请求Dify API - 用户: ${request.userid}, 方向: ${request.direction}`);
        console.log(`[${new Date().toISOString()}] 请求Dify API - URL: ${config.apiUrl}/workflows/run`);
        console.log(`[${new Date().toISOString()}] 请求Dify API - 请求体: ${JSON.stringify(difyRequestBody)}`);
        
        // 调用Dify API
        const response = await fetch(`${config.apiUrl}/workflows/run`, {
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
        const TOTAL_STEPS = 9; // 默认总步数为9步
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
          // Split chunk into individual lines or events based on SSE format
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          // 记录接收到的原始数据块
          console.log(`[${new Date().toISOString()}] 接收Dify数据: ${chunk.replace(/\n/g, '\\n')}`);
          
          for (const line of lines) {
            if (line.trim() === 'event: ping') {
              // Handle ping event: Increment progress slowly if below 99
              if (lastProgress < 99) {
                const newProgress = Math.min(lastProgress + 1, 99);
                if (newProgress > lastProgress) { // Only send if progress actually changed
                  lastProgress = newProgress;
                  const progressEvent = {
                    event: "workflow_running",
                    task_id: lastTaskId, // Use last known IDs
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId, // Use last known workflowId
                      progress: newProgress.toString(),
                      status: "running"
                    }
                  };
                  console.log(`[${new Date().toISOString()}] [Ping Received] 发送小增量进度更新: ${newProgress}%`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                }
              }
            } else if (line.startsWith('data: ')) {
              // Handle data event: Parse JSON and process
              try {
                const eventData = JSON.parse(line.substring(6));
                
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
                    workflowId = String(eventData.data.workflow_id);
                    console.log(`[${new Date().toISOString()}] 获取到workflowId: ${workflowId}`);
                  } else if (eventData.data && eventData.data.inputs && eventData.data.inputs['sys.workflow_id']) {
                    // 确保转换为字符串
                    const inputWorkflowId = eventData.data.inputs['sys.workflow_id'];
                    workflowId = typeof inputWorkflowId === 'string' ? inputWorkflowId : String(inputWorkflowId);
                    console.log(`[${new Date().toISOString()}] 从inputs获取到workflowId: ${workflowId}`);
                  } else {
                    // 如果都获取不到，为空
                    workflowId = "";
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
                  
                  if (eventData.data && eventData.data.text) {
                    const textChunkEvent = {
                      event: "text_chunk",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        ...eventData.data,
                        title: "生成标题中" // 添加当前标题
                      }
                    };
                    
                    const textContent = typeof eventData.data.text === 'string' ? eventData.data.text : String(eventData.data.text);
                    console.log(`[${new Date().toISOString()}] 转发文本块事件: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
                    
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
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
                    // 检查result的类型
                    const outputResult = eventData.data.outputs.result;
                    if (Array.isArray(outputResult)) {
                      // 如果已经是数组，直接使用
                      result = outputResult.filter((title: string) => title && typeof title === 'string' && title.trim() !== '');
                      console.log(`[${new Date().toISOString()}] 直接使用数组结果，共${result.length}个标题`);
                    } else if (typeof outputResult === 'string') {
                      // 向后兼容：如果是字符串，按换行符分割
                      result = outputResult.split('\n\n').filter((title: string) => title.trim() !== '');
                      console.log(`[${new Date().toISOString()}] 将字符串结果分割为数组，共${result.length}个标题`);
                    }
                    
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
                console.error(`[${new Date().toISOString()}] 解析失败的数据: ${line.substring(6)}`);
              }
            } // End of handling 'data:' line
          } // End of loop through lines
        } // End of while loop
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
            workflow_id: "", // 错误情况下为空
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
      let animationIntervalId: NodeJS.Timeout | null = null;
      let isWorkflowRunning = false;
      
      // State variables moved up to be accessible by timer closure
      let lastTaskId = '';
      let lastWorkflowRunId = '';
      let workflowId = '';
      let lastProgress = 0;
      let lastSentTitle: string = '开始生成文章';
      let lastEmojiPair: string[] = ['⏳', '⚙️'];
      let currentEmojiIndex = 0;
      let currentEllipsisIndex = 0; // Index for ellipsis states
      const ellipsisStates = ['.', '..', '...']; // Ellipsis states
      const titleMapping: Record<string, { title: string; emojiPair: string[] }> = {
          "初步分析 (LLM)":     { title: "拟题分析中",       emojiPair: ['🤔', '🧐'] },
          "[工具] 参考文献抓取": { title: "阅读参考文献中", emojiPair: ['📖', '📚'] },
          "(学会)[工具] 参考文献抓取": { title: "阅读参考文献中", emojiPair: ['📖', '📚'] },
          "(必读)[工具] 参考文章概要浓缩": { title: "阅读参考文章中", emojiPair: ['📖', '📚'] },
          "初版文章生成 (LLM)": { title: "文章撰写中",       emojiPair: ['✍️', '📝'] },
          "格式优化 (LLM)":   { title: "文章格式美化中",   emojiPair: ['✨', '💅'] }
      };
      const defaultEmojiPair = ['⏳', '⚙️'];

      // --- Timer function for animation ---
      const startAnimationTimer = () => {
        if (animationIntervalId) clearInterval(animationIntervalId); // Clear previous if any
        
        animationIntervalId = setInterval(() => {
          if (!isWorkflowRunning) {
            if (animationIntervalId) clearInterval(animationIntervalId);
            animationIntervalId = null;
            return;
          }
          
          // Construct title with current emoji AND ellipsis
          const emojiPrefix = (lastEmojiPair && lastEmojiPair.length >= 2) ? `${lastEmojiPair[currentEmojiIndex]} ` : '';
          const ellipsisSuffix = ellipsisStates[currentEllipsisIndex];
          const displayTitle = `${emojiPrefix}${lastSentTitle}${ellipsisSuffix}`;
          
          // Toggle emoji index for next time
          currentEmojiIndex = (currentEmojiIndex + 1) % 2;
          // Cycle ellipsis index for next time
          currentEllipsisIndex = (currentEllipsisIndex + 1) % ellipsisStates.length;

          const progressEvent = {
            event: "workflow_running",
            task_id: lastTaskId, 
            workflow_run_id: lastWorkflowRunId,
            data: {
              workflow_id: workflowId,
              progress: lastProgress.toString(), 
              status: "running",
              title: displayTitle // Send title with emoji and ellipsis
            }
          };
          // Send update purely for animation
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));

        }, 600); // Animation interval (600ms)
      };

      // --- Function to stop animation timer ---
      const stopAnimationTimer = () => {
        isWorkflowRunning = false;
        if (animationIntervalId) {
          clearInterval(animationIntervalId);
          animationIntervalId = null;
        }
      };

      try {
        // 准备请求Dify API的数据
        const difyRequestBody = {
          inputs: {
            author: request.name,
            unit: request.unit,
            direction: request.direction,
            subject: request.title,
            word_count: request.word_count,
            style: request.style || '生动有趣，角度新颖', // 默认风格
            journal: request.journal || '健康向导', // 默认期刊
            outline: request.outline || '' // 文章大纲
          },
          response_mode: "streaming",
          user: request.userid // 使用userid作为用户标识
        };
        
        // 记录请求信息
        console.log(`[${new Date().toISOString()}] 请求生成文章Dify API - 方向: ${request.direction}`);
        console.log(`[${new Date().toISOString()}] 请求生成文章Dify API - URL: ${config.apiUrl}/workflows/run`);
        console.log(`[${new Date().toISOString()}] 请求生成文章Dify API - 请求体: ${JSON.stringify(difyRequestBody)}`);
        
        // 调用Dify API
        const response = await fetch(`${config.apiUrl}/workflows/run`, {
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
        const TOTAL_STEPS = 19; // 文章生成一共有19步
        let finishedSteps = 0; // 已完成的步数
        let buffer = '';
        
        console.log(`[${new Date().toISOString()}] 开始处理生成文章Dify API响应流`);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[${new Date().toISOString()}] 生成文章Dify API响应流结束`);
            stopAnimationTimer(); // Ensure timer stops on stream end
            
            // 流结束时，尝试处理缓冲区中可能剩余的数据
            if (buffer.trim()) {
              console.log(`[${new Date().toISOString()}] 处理流结束时缓冲区中的剩余数据: ${buffer.length} 字节`);
              try {
                processEvent('data: ' + buffer);
              } catch (e) {
                console.error(`[${new Date().toISOString()}] 处理结束缓冲数据时出错:`, e);
              }
            }
            
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          // 将新chunk添加到缓冲区
          buffer += chunk;
          
          // 记录接收到的原始数据块
          console.log(`[${new Date().toISOString()}] 接收生成文章Dify数据: ${chunk.replace(/\n/g, '\\n')}`);
          
          // 尝试从缓冲区中提取完整的SSE事件
          const events = buffer.split('\n\n');
          
          // 保留最后一个可能不完整的事件到缓冲区
          buffer = events.pop() || '';
          
          for (const event of events.filter(e => e.trim() !== '')) {
             // Ping events now update the progress state for the timer to pick up
            if (event.trim() === 'event: ping') { 
                console.log(`[${new Date().toISOString()}] Ping received.`);
                // Increment progress state if below 99
                if (lastProgress < 99) {
                    const newProgress = Math.min(lastProgress + 1, 99);
                    if (newProgress > lastProgress) {
                        console.log(`[${new Date().toISOString()}] Progress updated by ping: ${newProgress}%`);
                        lastProgress = newProgress; // Update state for timer
                    }
                }
                continue; // Don't process ping further
            } 
            
            if (event.startsWith('data: ')) {
              try {
                processEvent(event); // Process data event
              } catch (e) {
                console.error(`[${new Date().toISOString()}] 处理事件时出错 (in loop):`, e);
              }
            } else {
              console.log(`[${new Date().toISOString()}] 忽略非标准SSE行: ${event}`);
            }
          } 
        } 
        
        // --- Process Event Function --- 
        function processEvent(event: string) {
          // This function now only processes 'data:' events
          if (!event.startsWith('data: ')) {
             console.warn('processEvent called with non-data event:', event); 
             return;
          }
          
          try {
            // 从事件文本中提取JSON数据
            const jsonStr = event.substring(6);
            
            // 尝试解析JSON
            let eventData: DifyEventData = {}; // 初始化为空对象以避免undefined问题
            try {
              eventData = JSON.parse(jsonStr);
            } catch (jsonError) {
              console.error(`[${new Date().toISOString()}] JSON解析错误:`, jsonError);
              console.log(`[${new Date().toISOString()}] 尝试修复可能的JSON格式问题`);
              
              // 如果是文章完成事件但JSON解析失败，尝试从原始文本中提取关键信息
              if (jsonStr.includes('"event": "workflow_finished"')) {
                console.log(`[${new Date().toISOString()}] 检测到工作流完成事件，尝试手动提取信息`);
                
                // 创建基本的完成事件
                eventData = {
                  event: "workflow_finished",
                  task_id: lastTaskId || `recover-${Date.now()}`,
                  workflow_run_id: lastWorkflowRunId || `recover-${Date.now()}`,
                  data: {
                    workflow_id: workflowId || "",
                    id: extractValue(jsonStr, '"id":', ','),
                    files: []
                  }
                };
                
                // 尝试提取文件URL
                const fileUrlMatch = jsonStr.match(/\/files\/tools\/[^"\\]+\.docx[^"\\]*/);
                if (fileUrlMatch && fileUrlMatch[0]) {
                  const urlPath = fileUrlMatch[0];
                  // 确保URL不会重复添加前缀
                  const fullUrl = urlPath.startsWith('http') 
                    ? urlPath 
                    : `${config.baseUrl}${urlPath}`;
                  
                  // 确保eventData.data存在并且可以赋值
                  if (eventData.data) {
                    eventData.data.files = [{ url: fullUrl }];
                    console.log(`[${new Date().toISOString()}] 从损坏的JSON中成功提取URL: ${fullUrl}`);
                  }
                }
              } else {
                // 如果不是工作流完成事件或无法修复，则跳过
                console.log(`[${new Date().toISOString()}] 无法修复JSON，跳过此事件`);
                return;
              }
            }
            
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
                workflowId = String(eventData.data.workflow_id);
                console.log(`[${new Date().toISOString()}] 获取到生成文章workflowId: ${workflowId}`);
              } else if (eventData.data && eventData.data.inputs && eventData.data.inputs['sys.workflow_id']) {
                // 确保转换为字符串
                const inputWorkflowId = eventData.data.inputs['sys.workflow_id'];
                workflowId = typeof inputWorkflowId === 'string' ? inputWorkflowId : String(inputWorkflowId);
                console.log(`[${new Date().toISOString()}] 从inputs获取到生成文章workflowId: ${workflowId}`);
              } else {
                // 如果都获取不到，为空
                workflowId = "";
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
                  status: "running",
                  title: lastSentTitle // Send plain title
                }
              };
              
              // 记录发送的事件
              console.log(`[${new Date().toISOString()}] 发送生成文章开始事件: ${JSON.stringify(startEvent)}`);
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
              lastProgress = 0;
              lastSentTitle = '开始生成文章'; // Reset title
              lastEmojiPair = defaultEmojiPair; // Reset emoji pair
              currentEmojiIndex = 0; // Reset emoji index
              currentEllipsisIndex = 0; // Reset ellipsis index
              isWorkflowRunning = true; // Set running flag
              startAnimationTimer(); // Start animation timer
            }
            else if (eventData.event === 'node_finished') {
              finishedSteps += 1;
              const progressPercent = Math.min(Math.floor((finishedSteps / TOTAL_STEPS) * 100), 99);
              if (progressPercent > lastProgress) {
                  console.log(`[${new Date().toISOString()}] Progress updated by node_finished: ${progressPercent}%`);
                  lastProgress = progressPercent; // Update progress state for timer
                  // Timer will handle sending the update
              }
            }
            else if (eventData.event === 'node_started') {
              const difyNodeTitle = eventData.data?.title;
              if (difyNodeTitle && typeof difyNodeTitle === 'string') {
                console.log(`[${new Date().toISOString()}] Dify Node Started: ${difyNodeTitle}`);
                const mapping = titleMapping[difyNodeTitle];
                if (mapping && mapping.title !== lastSentTitle) {
                    console.log(`[${new Date().toISOString()}] State change: ${mapping.title} ${mapping.emojiPair.join('')}`);
                    lastSentTitle = mapping.title; 
                    lastEmojiPair = mapping.emojiPair;
                    currentEmojiIndex = 0; // Reset emoji index for new status
                    currentEllipsisIndex = 0; // Reset ellipsis index for new status
                    
                    // Send immediate update for the new status with first ellipsis
                    const emojiPrefix = `${lastEmojiPair[currentEmojiIndex]} `;
                    const ellipsisSuffix = ellipsisStates[currentEllipsisIndex];
                    const displayTitle = `${emojiPrefix}${lastSentTitle}${ellipsisSuffix}`;

                    const progressEvent = {
                      event: "workflow_running",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        workflow_id: workflowId,
                        progress: lastProgress.toString(), 
                        status: "running",
                        title: displayTitle // Send title with emoji and ellipsis
                      }
                    };
                    console.log(`[${new Date().toISOString()}] Sending immediate progress update for mapped node start: ${lastProgress}% - ${displayTitle}`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                    
                    // Increment indices AFTER sending this first one, so timer starts with next state
                    currentEmojiIndex = (currentEmojiIndex + 1) % 2; 
                    currentEllipsisIndex = (currentEllipsisIndex + 1) % ellipsisStates.length;
                }
              } else {
                 console.log(`[${new Date().toISOString()}] Node Started event received without a valid title in data object.`);
              }
            }
            else if (eventData.event === 'text_chunk') {
              console.log(`[${new Date().toISOString()}] 接收到文本块`);
              
              if (eventData.data && eventData.data.text) {
                const textChunkEvent = {
                  event: "text_chunk",
                  task_id: lastTaskId,
                  workflow_run_id: lastWorkflowRunId,
                  data: {
                    ...eventData.data,
                    title: lastSentTitle // 使用当前步骤的标题
                  }
                };
                
                const textContent = typeof eventData.data.text === 'string' ? eventData.data.text : String(eventData.data.text);
                console.log(`[${new Date().toISOString()}] 转发文本块事件: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
              }
            }
            else if (eventData.event === 'workflow_finished') {
              console.log(`[${new Date().toISOString()}] 生成文章工作流完成`);
              stopAnimationTimer(); // Stop animation timer
              lastProgress = 100; // Ensure final progress is 100
              
              try {
                // 如果在workflow_finished事件中可以获取workflowId，则更新
                if (eventData.data && eventData.data.workflow_id && !workflowId) {
                  workflowId = eventData.data.workflow_id;
                  console.log(`[${new Date().toISOString()}] 从完成事件获取生成文章workflowId: ${workflowId}`);
                }
                
                // 处理文件URL
                const files: Array<FileData> = [];
                
                // 如果eventData中已经包含提取的文件，直接使用
                if (eventData.data?.files && Array.isArray(eventData.data.files) && eventData.data.files.length > 0) {
                  console.log(`[${new Date().toISOString()}] 使用预提取的文件: ${JSON.stringify(eventData.data.files)}`);
                  // 不直接使用预提取的files，而是确保URL正确拼接
                  eventData.data.files.forEach((file: FileData) => {
                    if (file && file.url) {
                      // 拼接完整URL
                      const fullUrl = file.url.startsWith('http') 
                        ? file.url 
                        : `${config.baseUrl}${file.url}`;
                      files.push({ url: fullUrl });
                      console.log(`[${new Date().toISOString()}] 处理预提取文件URL: ${fullUrl}`);
                    }
                  });
                } else {
                  console.log(`[${new Date().toISOString()}] 生成文章完成事件数据: ${JSON.stringify(eventData.data)}`);
                  
                  // 优先检查存在id和files的情况（新格式）
                  if (eventData.data && eventData.data.id) {
                    console.log(`[${new Date().toISOString()}] 检测到id格式的完成事件: ${eventData.data.id}`);
                    
                    if (eventData.data.files && Array.isArray(eventData.data.files)) {
                      // 遍历文件数组并提取URL字段
                      eventData.data.files.forEach((file: FileData) => {
                        if (file && file.url) {
                          // 拼接完整URL
                          const fullUrl = file.url.startsWith('http') 
                            ? file.url 
                            : `${config.baseUrl}${file.url}`;
                          files.push({ url: fullUrl });
                          console.log(`[${new Date().toISOString()}] 解析到生成文章文件URL(id格式): ${fullUrl}`);
                        }
                      });
                    }
                  }
                  
                  // 如果没有找到URL，尝试从原始eventData.data直接提取
                  if (files.length === 0) {
                    console.log(`[${new Date().toISOString()}] 尝试从原始数据中提取文件URL`);
                    
                    // 解析文件URL
                    if (eventData.data?.files && Array.isArray(eventData.data.files)) {
                      // 遍历文件数组并提取URL字段
                      eventData.data.files.forEach((file: FileData) => {
                        if (file && typeof file === 'object') {
                          if (file.url) {
                            // 拼接完整URL
                            const fullUrl = file.url.startsWith('http') 
                              ? file.url 
                              : `${config.baseUrl}${file.url}`;
                            files.push({ url: fullUrl });
                            console.log(`[${new Date().toISOString()}] 解析到生成文章文件URL: ${fullUrl}`);
                          } else if (file.remote_url) {
                            const fullUrl = file.remote_url.startsWith('http')
                              ? file.remote_url
                              : `${config.baseUrl}${file.remote_url}`;
                            files.push({ url: fullUrl });
                            console.log(`[${new Date().toISOString()}] 解析到生成文章远程URL: ${fullUrl}`);
                          }
                        }
                      });
                    }
                  }
                  
                  // 如果还是没有找到URL，尝试从原始JSON字符串中提取
                  if (files.length === 0) {
                    console.log(`[${new Date().toISOString()}] 尝试从原始JSON字符串中提取URL`);
                    const fileUrlMatches = jsonStr.match(/\/files\/tools\/[^"\\]+\.docx[^"\\]*/g);
                    if (fileUrlMatches && fileUrlMatches.length > 0) {
                      fileUrlMatches.forEach(urlPart => {
                        // 确保URL不会重复添加前缀
                        const fullUrl = urlPart.startsWith('http') 
                          ? urlPart 
                          : `${config.baseUrl}${urlPart}`;
                        files.push({ url: fullUrl });
                        console.log(`[${new Date().toISOString()}] 从字符串中提取到URL: ${fullUrl}`);
                      });
                    }
                  }
                  
                  // 如果还是没有找到URL，尝试递归搜索data对象
                  if (files.length === 0 && eventData.data) {
                    console.log(`[${new Date().toISOString()}] 尝试递归搜索data对象寻找URL`);
                    
                    type RecordObject = Record<string, unknown>;
                    
                    const findUrls = (obj: RecordObject, prefix: string = ''): void => {
                      if (!obj || typeof obj !== 'object') return;
                      
                      // 检查当前对象是否有url属性
                      if ('url' in obj && typeof obj.url === 'string') {
                        // 确保URL不会重复添加前缀
                        const fullUrl = obj.url.startsWith('http') 
                          ? obj.url 
                          : `${config.baseUrl}${obj.url}`;
                        files.push({ url: fullUrl });
                        console.log(`[${new Date().toISOString()}] 在${prefix}找到URL: ${fullUrl}`);
                      }
                      
                      // 递归搜索子对象
                      for (const key in obj) {
                        if (obj[key] && typeof obj[key] === 'object') {
                          findUrls(obj[key] as RecordObject, `${prefix}.${key}`);
                        }
                      }
                    };
                    
                    // 确保传递的是对象
                    findUrls(eventData.data as RecordObject, 'data');
                  }
                }
                
                // 保存文章到Supabase - 修改为同步执行
                if (files.length > 0 && files[0].url) {
                  try {
                    // 定义超时时间（毫秒）
                    const SAVE_TIMEOUT = 30000; // 30秒
                    let savedUrl: string | null = null;
                    
                    console.log(`[${new Date().toISOString()}] 准备同步保存文章到Supabase: ${files[0].url}`);
                    
                    const saveArticle = async (): Promise<string | null> => {
                      try {
                        // 导入article_storage模块
                        const articleStorage = await import('./article_storage');
                        const fileUrl = files[0].url as string;
                        
                        console.log(`[${new Date().toISOString()}] 开始保存文章到Supabase: ${fileUrl}`);
                        
                        // 准备文章信息，确保所有属性都有默认值
                        const articleInfo = {
                          name: request.name || '未命名文章',
                          unit: request.unit || '',
                          direction: request.direction || '',
                          title: request.title || '未命名标题',
                          word_count: request.word_count || 0,
                          dify_task_id: lastTaskId || '',
                          style: request.style || '生动有趣，角度新颖',
                          journal: request.journal || '健康向导',
                          outline: request.outline || '',
                          userid: request.userid || 'anonymous'
                        };
                        
                        // 保存文章
                        const saveResult = await articleStorage.saveArticleToSupabase(
                          fileUrl, 
                          request.userid ? request.userid : 'anonymous', 
                          articleInfo
                        );
                        
                        console.log(`[${new Date().toISOString()}] 文章保存成功, 记录ID: ${saveResult.recordId}, URL: ${saveResult.publicUrl}`);
                        return saveResult.publicUrl;
                      } catch (saveError) {
                        console.error(`[${new Date().toISOString()}] 保存文章到Supabase时出错:`, saveError);
                        return null;
                      }
                    };
                    
                    // 创建一个带超时的Promise
                    const saveWithTimeout = async (): Promise<string | null> => {
                      return new Promise((resolve) => {
                        // 设置超时
                        const timeout = setTimeout(() => {
                          console.log(`[${new Date().toISOString()}] 保存文章操作超时`);
                          resolve(null);
                        }, SAVE_TIMEOUT);
                        
                        // 执行保存操作
                        saveArticle().then((url) => {
                          clearTimeout(timeout);
                          resolve(url);
                        }).catch(() => {
                          clearTimeout(timeout);
                          resolve(null);
                        });
                      });
                    };
                    
                    // 使用立即执行异步函数执行等待操作
                    (async () => {
                      // 等待保存完成或超时
                      savedUrl = await saveWithTimeout();
                      
                      // 如果保存成功，更新文件URL
                      if (savedUrl) {
                        console.log(`[${new Date().toISOString()}] 更新文件URL为Supabase URL: ${savedUrl}`);
                        files[0].saved = true;
                        files[0].url = savedUrl;
                      } else {
                        console.log(`[${new Date().toISOString()}] 保存文章失败或超时，使用原始URL`);
                        files[0].saved = false;
                      }
                      
                      // 发送完成事件
                      sendFinishEvent();
                    })().catch(asyncError => {
                      console.error(`[${new Date().toISOString()}] 异步保存过程中出错:`, asyncError);
                      files[0].saved = false;
                      files[0].saveError = asyncError instanceof Error ? asyncError.message : String(asyncError);
                      
                      // 发送完成事件
                      sendFinishEvent();
                    });
                    
                    // 将发送完成事件的逻辑封装到函数中
                    function sendFinishEvent() {
                      // 强制设置进度为100%
                      lastProgress = 100;
                      
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
                          status: files.length > 0 ? "succeeded" : "failed"
                        }
                      };
                      
                      console.log(`[${new Date().toISOString()}] 发送生成文章完成事件, 文件数: ${files.length}, 耗时: ${eventData.data?.elapsed_time || 'unknown'}`);
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                    }
                    
                    // 注意：这里不再发送完成事件，因为会在异步保存过程完成后发送
                    return;
                  } catch (outerError) {
                    console.error(`[${new Date().toISOString()}] 尝试保存文章时发生外部错误:`, outerError);
                    files[0].saved = false;
                    files[0].saveError = outerError instanceof Error ? outerError.message : String(outerError);
                  }
                } else {
                  console.log(`[${new Date().toISOString()}] 没有找到文件URL，无法保存文章`);
                }
                
                // 强制设置进度为100%
                lastProgress = 100;
                
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
                    status: files.length > 0 ? "succeeded" : "failed"
                  }
                };
                
                console.log(`[${new Date().toISOString()}] 发送生成文章完成事件, 文件数: ${files.length}, 耗时: ${eventData.data?.elapsed_time || 'unknown'}`);
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
              } catch (error) {
                console.error(`[${new Date().toISOString()}] 处理文章生成完成事件时出错:`, error);
                
                // 发送一个基础的完成事件，避免客户端一直等待
                const basicFinishEvent = {
                  event: "workflow_finished",
                  task_id: lastTaskId || `fallback-${Date.now()}`,
                  workflow_run_id: lastWorkflowRunId || `fallback-${Date.now()}`,
                  data: {
                    workflow_id: workflowId || "",
                    progress: "100",
                    files: [],
                    elapsed_time: "0",
                    status: "failed",
                    error: "处理完成事件时出错"
                  }
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(basicFinishEvent)}\n\n`));
              }
            }
          } catch (e) {
            console.error(`[${new Date().toISOString()}] 解析生成文章Dify事件数据时出错:`, e);
          }
        }
        
        // 从JSON字符串中提取键值（简易方法，用于损坏的JSON）
        function extractValue(jsonStr: string, key: string, endChar: string): string {
          try {
            const keyIndex = jsonStr.indexOf(key);
            if (keyIndex === -1) return "";
            
            const valueStart = jsonStr.indexOf(':', keyIndex) + 1;
            let valueEnd = jsonStr.indexOf(endChar, valueStart);
            if (valueEnd === -1) valueEnd = jsonStr.length;
            
            const value = jsonStr.substring(valueStart, valueEnd).trim();
            // 去除引号
            return value.replace(/^"/, '').replace(/"$/, '');
          } catch (e) {
            console.error(`[${new Date().toISOString()}] 提取值时出错:`, e);
            return "";
          }
        }
      } catch (error: unknown) {
        console.error(`[${new Date().toISOString()}] 调用生成文章Dify API时出错:`, error);
        stopAnimationTimer(); // Stop timer on error
        
        // 错误消息
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        console.error(`[${new Date().toISOString()}] 错误详情: ${errorMessage}`);
        
        // 发送错误事件
        const errorEvent = {
          event: "workflow_finished", // 使用workflow_finished事件类型，让客户端知道流程已结束
          task_id: `error-${Date.now()}`,
          workflow_run_id: `error-${Date.now()}`,
          data: {
            workflow_id: "",
            progress: "100",
            files: [], // 空文件数组
            error: errorMessage,
            elapsed_time: "0",
            status: "failed"
          }
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      } finally {
         // Ensure timer is cleaned up if stream closes unexpectedly
         stopAnimationTimer();
      }
    }
  });
}

/**
 * 从环境变量中配置Dify API
 */
export function getDifyConfig(): DifyAPIConfig {
  const config = {
    apiKey: process.env.TITLES_DIFY_API_KEY || '',
    baseUrl: process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn',
    apiUrl: process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1',
  };
  
  console.log(`[${new Date().toISOString()}] Dify配置: baseUrl=${config.baseUrl}`);
  console.log(`[${new Date().toISOString()}] Dify配置: apiUrl=${config.apiUrl}`);
  // 不打印API密钥，以保护安全
  
  return config;
}

/**
 * 获取生成文章专用的Dify配置
 */
export function getArticleDifyConfig(): DifyAPIConfig {
  // 文章生成专用API Key
  const apiKey = process.env.ARTICLE_DIFY_API_KEY || '';

  // 使用与标题生成相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案总结专用的Dify配置
 */
export function getCaseSummaryDifyConfig(): DifyAPIConfig {
  // 病案总结专用API Key
  const apiKey = process.env.CASE_SUMMARY_DIFY_API_KEY || 'app-TFflIaFV2yYVRljnhiypkPTy';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案拟题专用的Dify配置
 */
export function getCaseTopicDifyConfig(): DifyAPIConfig {
  // 病案拟题专用API Key
  const apiKey = process.env.CASE_TOPIC_DIFY_API_KEY || 'app-h0GZLxEkF2uDP5l8CnvoY7ZH';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案报告专用的Dify配置
 */
export function getCaseReportDifyConfig(): DifyAPIConfig {
  // 病案报告专用API Key
  const apiKey = process.env.CASE_REPORT_DIFY_API_KEY || 'app-gWH39gHNorohRp018C7Wll0Q';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 上传文件到Dify并获取upload_file_id
 */
export async function uploadFileToDify(file: File, config: DifyAPIConfig): Promise<string> {
  console.log(`[${new Date().toISOString()}] 开始上传文件到Dify: ${file.name}, 大小: ${file.size} bytes`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', 'api-user');

  const uploadUrl = `${config.apiUrl}/files/upload`;
  console.log(`[${new Date().toISOString()}] 文件上传URL: ${uploadUrl}`);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${new Date().toISOString()}] 文件上传失败: ${response.status} ${response.statusText} - ${errorText}`);
    throw new Error(`文件上传失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`[${new Date().toISOString()}] 文件上传成功，upload_file_id: ${result.id}`);
  return result.id; // 返回 upload_file_id
}

// 定义事件数据接口
interface DifyEventData {
  event?: string;
  task_id?: string;
  workflow_run_id?: string;
  data?: {
    workflow_id?: string;
    id?: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    elapsed_time?: number | string;
    files?: Array<FileData>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// 文件数据接口
interface FileData {
  url?: string;
  remote_url?: string;
  [key: string]: unknown;
}

/**
 * 调用Dify API执行病案总结工作流
 */
export async function callDifyCaseSummaryAPI(
  config: DifyAPIConfig,
  request: GenerateCaseSummaryRequest
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        console.log(`[${new Date().toISOString()}] 开始病案总结工作流 - 用户: ${request.userid}`);
        console.log(`[${new Date().toISOString()}] 文件数量: ${request.files.length}`);

        // 第一步：上传所有文件并获取upload_file_id
        const uploadedFileIds: string[] = [];
        for (let i = 0; i < request.files.length; i++) {
          const file = request.files[i];
          console.log(`[${new Date().toISOString()}] 上传文件 ${i + 1}/${request.files.length}: ${file.name}`);

          try {
            const uploadFileId = await uploadFileToDify(file, config);
            uploadedFileIds.push(uploadFileId);
            console.log(`[${new Date().toISOString()}] 文件 ${file.name} 上传成功，ID: ${uploadFileId}`);
          } catch (uploadError) {
            console.error(`[${new Date().toISOString()}] 文件 ${file.name} 上传失败:`, uploadError);
            throw new Error(`文件上传失败: ${uploadError.message}`);
          }
        }

        // 第二步：准备工作流请求参数
        const fileList = uploadedFileIds.map(uploadFileId => ({
          type: 'image',
          transfer_method: 'local_file',
          upload_file_id: uploadFileId
        }));

        const inputs = {
          name: request.name,
          unit: request.unit,
          files: fileList  // 使用正确的文件格式
        };

        console.log(`[${new Date().toISOString()}] 准备工作流请求参数:`, JSON.stringify(inputs, null, 2));

        // 第三步：调用工作流API
        const workflowPayload = {
          inputs,
          response_mode: 'streaming',
          user: request.userid
        };

        console.log(`[${new Date().toISOString()}] 调用工作流API - URL: ${config.apiUrl}/workflows/run`);
        console.log(`[${new Date().toISOString()}] 工作流请求体:`, JSON.stringify(workflowPayload, null, 2));

        const response = await fetch(`${config.apiUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workflowPayload)
        });

        // 记录响应状态
        console.log(`[${new Date().toISOString()}] 病案总结Dify API响应状态: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          throw new Error(`病案总结Dify API 请求失败: ${response.status} ${response.statusText}`);
        }

        // 处理SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取病案总结Dify API响应');
        }

        // 进度跟踪
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let lastProgress = 0;
        let workflowFinished = false;
        let collectedTextChunks: string[] = [];

        console.log(`[${new Date().toISOString()}] 开始处理病案总结Dify API响应流`);

        // 读取SSE流
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[${new Date().toISOString()}] 病案总结Dify API响应流结束`);
            break;
          }

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          // 记录接收到的原始数据块
          console.log(`[${new Date().toISOString()}] 接收病案总结Dify数据: ${chunk.replace(/\n/g, '\\n')}`);

          for (const line of lines) {
            if (line.trim() === 'event: ping') {
              // 处理ping事件，缓慢增加进度
              if (lastProgress < 99) {
                const newProgress = Math.min(lastProgress + 1, 99);
                if (newProgress > lastProgress) {
                  lastProgress = newProgress;
                  const progressEvent = {
                    event: "workflow_running",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: newProgress.toString(),
                      status: "running",
                      title: "分析病案图片中"
                    }
                  };
                  console.log(`[${new Date().toISOString()}] [Ping] 发送进度更新: ${newProgress}%`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                }
              }
            } else if (line.startsWith('data: ')) {
              // 处理数据事件
              try {
                const eventData = JSON.parse(line.substring(6));

                console.log(`[${new Date().toISOString()}] 接收到病案总结Dify事件: ${eventData.event || 'unknown'}`);

                // 提取task_id和workflow_run_id
                if (eventData.task_id) {
                  lastTaskId = eventData.task_id;
                }
                if (eventData.workflow_run_id) {
                  lastWorkflowRunId = eventData.workflow_run_id;
                }

                // 根据事件类型处理
                if (eventData.event === 'workflow_started') {
                  // 提取workflowId
                  if (eventData.data && eventData.data.workflow_id) {
                    workflowId = String(eventData.data.workflow_id);
                    console.log(`[${new Date().toISOString()}] 获取到workflowId: ${workflowId}`);
                  }

                  // 发送开始事件
                  const startEvent = {
                    event: "workflow_started",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: "0",
                      status: "running",
                      title: "开始分析病案"
                    }
                  };

                  console.log(`[${new Date().toISOString()}] 发送病案总结开始事件`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                  lastProgress = 0;
                }
                else if (eventData.event === 'node_finished') {
                  // 节点完成，增加进度
                  const newProgress = Math.min(lastProgress + 15, 95);
                  if (newProgress > lastProgress) {
                    lastProgress = newProgress;
                    const progressEvent = {
                      event: "workflow_running",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        workflow_id: workflowId,
                        progress: newProgress.toString(),
                        status: "running",
                        title: "分析病案图片中"
                      }
                    };

                    console.log(`[${new Date().toISOString()}] 节点完成，发送进度更新: ${newProgress}%`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'text_chunk') {
                  console.log(`[${new Date().toISOString()}] 接收到病案总结文本块`);

                  // 收集文本块用于最终结果
                  if (eventData.data && eventData.data.text) {
                    const textContent = typeof eventData.data.text === 'string' ? eventData.data.text : String(eventData.data.text);
                    collectedTextChunks.push(textContent);

                    // 转发文本块事件
                    const textChunkEvent = {
                      event: "text_chunk",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        ...eventData.data,
                        title: "生成病案总结中"
                      }
                    };

                    console.log(`[${new Date().toISOString()}] 转发病案总结文本块: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'workflow_finished') {
                  console.log(`[${new Date().toISOString()}] 病案总结工作流完成`);
                  workflowFinished = true;

                  // 解析结果
                  let result: string[] = [];

                  console.log(`[${new Date().toISOString()}] 病案总结完成事件原始数据:`, JSON.stringify(eventData.data, null, 2));

                  if (eventData.data && eventData.data.outputs) {
                    // 查找输出中的总结内容
                    const outputs = eventData.data.outputs;
                    console.log(`[${new Date().toISOString()}] 病案总结outputs结构:`, JSON.stringify(outputs, null, 2));

                    if (outputs.text) {
                      result = [String(outputs.text)];
                      console.log(`[${new Date().toISOString()}] 从outputs.text获取结果: ${result[0].length} 字符`);
                    } else if (outputs.summary) {
                      result = [String(outputs.summary)];
                      console.log(`[${new Date().toISOString()}] 从outputs.summary获取结果: ${result[0].length} 字符`);
                    } else if (outputs.result) {
                      result = Array.isArray(outputs.result) ? outputs.result : [String(outputs.result)];
                      console.log(`[${new Date().toISOString()}] 从outputs.result获取结果: ${result.length} 项`);
                    } else {
                      // 尝试获取outputs中的第一个字符串值
                      const outputKeys = Object.keys(outputs);
                      console.log(`[${new Date().toISOString()}] outputs可用字段:`, outputKeys);
                      for (const key of outputKeys) {
                        if (typeof outputs[key] === 'string' && outputs[key].trim().length > 0) {
                          result = [String(outputs[key])];
                          console.log(`[${new Date().toISOString()}] 从outputs.${key}获取结果: ${result[0].length} 字符`);
                          break;
                        }
                      }
                    }

                    console.log(`[${new Date().toISOString()}] 解析到病案总结结果: ${result.length} 项`);
                  } else {
                    console.log(`[${new Date().toISOString()}] 没有找到outputs数据`);
                  }

                  // 如果没有从outputs获取到结果，使用收集的文本块
                  if (result.length === 0 && collectedTextChunks.length > 0) {
                    result = [collectedTextChunks.join('')];
                    console.log(`[${new Date().toISOString()}] 使用收集的文本块作为结果: ${result[0].length} 字符`);
                  }

                  // 如果还是没有结果，记录警告
                  if (result.length === 0) {
                    console.log(`[${new Date().toISOString()}] 警告: 没有获取到任何结果内容`);
                    result = ['未能获取到生成的总结内容'];
                  }

                  // 发送完成事件
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

                  console.log(`[${new Date().toISOString()}] 发送病案总结完成事件`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                }
              } catch (e) {
                console.error(`[${new Date().toISOString()}] 解析病案总结Dify事件数据时出错:`, e);
                console.error(`[${new Date().toISOString()}] 解析失败的数据: ${line.substring(6)}`);
              }
            }
          }
        }

        // 流结束后检查是否已发送完成事件
        if (!workflowFinished) {
          console.log(`[${new Date().toISOString()}] 流结束但未收到workflow_finished事件，手动发送完成事件`);

          // 使用收集的文本块作为结果
          const result = collectedTextChunks.length > 0 ? [collectedTextChunks.join('')] : ['病案总结生成完成'];

          const finishEvent = {
            event: "workflow_finished",
            task_id: lastTaskId || "manual-finish-" + Date.now(),
            workflow_run_id: lastWorkflowRunId || "manual-finish-" + Date.now(),
            data: {
              workflow_id: workflowId,
              progress: "100",
              result,
              elapsed_time: "0",
              status: "succeeded"
            }
          };

          console.log(`[${new Date().toISOString()}] 发送手动完成事件，结果长度: ${result[0].length} 字符`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
        }

      } catch (error: unknown) {
        console.error(`[${new Date().toISOString()}] 调用病案总结Dify API时出错:`, error);

        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`[${new Date().toISOString()}] 错误信息: ${errorMessage}`);

        // 发送错误事件
        const errorEvent = {
          event: "workflow_finished",
          task_id: "error-" + Date.now(),
          workflow_run_id: "error-" + Date.now(),
          data: {
            workflow_id: "",
            progress: "100",
            result: [`调用病案总结Dify API时出错: ${errorMessage}`],
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
 * 调用Dify API执行病案拟题工作流
 */
export async function callDifyCaseTopicAPI(
  config: DifyAPIConfig,
  request: GenerateCaseTopicRequest
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        console.log(`[${new Date().toISOString()}] 开始病案拟题工作流 - 用户: ${request.userid}`);
        console.log(`[${new Date().toISOString()}] 病案总结长度: ${request.summary.length} 字符`);

        // 准备工作流请求参数
        const inputs = {
          summary: request.summary
        };

        const workflowPayload = {
          inputs,
          response_mode: 'streaming',
          user: request.userid
        };

        console.log(`[${new Date().toISOString()}] 调用病案拟题工作流API - URL: ${config.apiUrl}/workflows/run`);

        const response = await fetch(`${config.apiUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workflowPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${new Date().toISOString()}] 病案拟题Dify API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
          throw new Error(`Dify API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }

        if (!response.body) {
          throw new Error('响应体为空');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // 进度跟踪
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let workflowFinished = false;
        let collectedTextChunks: string[] = [];

        console.log(`[${new Date().toISOString()}] 开始处理病案拟题Dify API响应流`);

        // 读取SSE流
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[${new Date().toISOString()}] 病案拟题Dify API响应流结束`);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.substring(6));
                console.log(`[${new Date().toISOString()}] 病案拟题Dify事件:`, eventData.event);

                // 处理不同类型的事件
                if (eventData.event === 'workflow_started') {
                  console.log(`[${new Date().toISOString()}] 病案拟题工作流开始`);

                  lastTaskId = eventData.task_id || '';
                  lastWorkflowRunId = eventData.workflow_run_id || '';
                  workflowId = eventData.data?.workflow_id || '';

                  // 转发开始事件
                  const startEvent = {
                    event: "workflow_started",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: "0",
                      status: "running",
                      title: "开始生成题目"
                    }
                  };

                  console.log(`[${new Date().toISOString()}] 转发病案拟题开始事件`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                }
                else if (eventData.event === 'workflow_running') {
                  console.log(`[${new Date().toISOString()}] 病案拟题工作流运行中`);

                  const progress = parseInt(eventData.data?.progress || '0');

                  // 转发进度事件
                  const progressEvent = {
                    event: "workflow_running",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: progress.toString(),
                      status: "running",
                      title: eventData.data?.title || "生成题目中"
                    }
                  };

                  console.log(`[${new Date().toISOString()}] 转发病案拟题进度事件: ${progress}%`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                }
                else if (eventData.event === 'text_chunk') {
                  console.log(`[${new Date().toISOString()}] 接收到病案拟题文本块`);

                  // 收集文本块用于最终结果
                  if (eventData.data && eventData.data.text) {
                    const textContent = typeof eventData.data.text === 'string' ? eventData.data.text : String(eventData.data.text);
                    collectedTextChunks.push(textContent);

                    // 转发文本块事件
                    const textChunkEvent = {
                      event: "text_chunk",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        ...eventData.data,
                        title: "生成题目中"
                      }
                    };

                    console.log(`[${new Date().toISOString()}] 转发病案拟题文本块: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'workflow_finished') {
                  console.log(`[${new Date().toISOString()}] 病案拟题工作流完成`);
                  workflowFinished = true;

                  // 解析结果
                  let result: string[] = [];

                  console.log(`[${new Date().toISOString()}] 病案拟题完成事件原始数据:`, JSON.stringify(eventData.data, null, 2));

                  if (eventData.data && eventData.data.outputs) {
                    // 查找输出中的题目内容
                    const outputs = eventData.data.outputs;
                    console.log(`[${new Date().toISOString()}] 病案拟题outputs结构:`, JSON.stringify(outputs, null, 2));

                    if (outputs.text) {
                      // 尝试解析 outputs.text 中的 JSON 数据
                      try {
                        const textContent = String(outputs.text);
                        console.log(`[${new Date().toISOString()}] 原始text内容:`, textContent);

                        // 提取 JSON 部分（去掉 ```json 和 ``` 标记）
                        const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
                        if (jsonMatch) {
                          const jsonStr = jsonMatch[1];
                          console.log(`[${new Date().toISOString()}] 提取的JSON字符串:`, jsonStr);

                          const parsedData = JSON.parse(jsonStr);
                          console.log(`[${new Date().toISOString()}] 解析的JSON数据:`, parsedData);

                          if (parsedData.titles && Array.isArray(parsedData.titles)) {
                            result = parsedData.titles;
                            console.log(`[${new Date().toISOString()}] 从JSON.titles获取结果: ${result.length} 项`);
                          } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
                            result = parsedData.questions;
                            console.log(`[${new Date().toISOString()}] 从JSON.questions获取结果: ${result.length} 项`);
                          } else {
                            // 如果JSON中没有预期的字段，使用原始文本
                            result = [textContent];
                            console.log(`[${new Date().toISOString()}] JSON中没有预期字段，使用原始文本`);
                          }
                        } else {
                          // 如果不是JSON格式，直接使用文本内容
                          result = [textContent];
                          console.log(`[${new Date().toISOString()}] 不是JSON格式，使用原始文本: ${textContent.length} 字符`);
                        }
                      } catch (parseError) {
                        console.log(`[${new Date().toISOString()}] JSON解析失败:`, parseError);
                        result = [String(outputs.text)];
                        console.log(`[${new Date().toISOString()}] 解析失败，使用原始text: ${result[0].length} 字符`);
                      }
                    } else if (outputs.questions) {
                      result = Array.isArray(outputs.questions) ? outputs.questions : [String(outputs.questions)];
                      console.log(`[${new Date().toISOString()}] 从outputs.questions获取结果: ${result.length} 项`);
                    } else if (outputs.result) {
                      result = Array.isArray(outputs.result) ? outputs.result : [String(outputs.result)];
                      console.log(`[${new Date().toISOString()}] 从outputs.result获取结果: ${result.length} 项`);
                    } else {
                      // 尝试获取outputs中的第一个字符串值
                      const outputKeys = Object.keys(outputs);
                      console.log(`[${new Date().toISOString()}] outputs可用字段:`, outputKeys);
                      for (const key of outputKeys) {
                        if (typeof outputs[key] === 'string' && outputs[key].trim().length > 0 && key !== 'summary') {
                          result = [String(outputs[key])];
                          console.log(`[${new Date().toISOString()}] 从outputs.${key}获取结果: ${result[0].length} 字符`);
                          break;
                        }
                      }
                    }

                    console.log(`[${new Date().toISOString()}] 解析到病案拟题结果: ${result.length} 项`);
                  } else {
                    console.log(`[${new Date().toISOString()}] 没有找到outputs数据`);
                  }

                  // 如果没有从outputs获取到结果，使用收集的文本块
                  if (result.length === 0 && collectedTextChunks.length > 0) {
                    result = [collectedTextChunks.join('')];
                    console.log(`[${new Date().toISOString()}] 使用收集的文本块作为结果: ${result[0].length} 字符`);
                  }

                  // 如果还是没有结果，记录警告
                  if (result.length === 0) {
                    console.log(`[${new Date().toISOString()}] 警告: 没有获取到任何结果内容`);
                    result = ['未能获取到生成的题目内容'];
                  }

                  // 发送完成事件
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

                  console.log(`[${new Date().toISOString()}] 发送病案拟题完成事件`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                }
              } catch (parseError) {
                console.error(`[${new Date().toISOString()}] 解析病案拟题Dify事件失败:`, parseError);
              }
            }
          }
        }

        // 流结束后检查是否已发送完成事件
        if (!workflowFinished) {
          console.log(`[${new Date().toISOString()}] 流结束但未收到workflow_finished事件，手动发送完成事件`);

          // 使用收集的文本块作为结果
          const result = collectedTextChunks.length > 0 ? [collectedTextChunks.join('')] : ['题目生成完成'];

          const finishEvent = {
            event: "workflow_finished",
            task_id: lastTaskId || "manual-finish-" + Date.now(),
            workflow_run_id: lastWorkflowRunId || "manual-finish-" + Date.now(),
            data: {
              workflow_id: workflowId,
              progress: "100",
              result,
              elapsed_time: "0",
              status: "succeeded"
            }
          };

          console.log(`[${new Date().toISOString()}] 发送手动完成事件，结果长度: ${result[0].length} 字符`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
        }

      } catch (error: unknown) {
        console.log(`[${new Date().toISOString()}] 病案拟题Dify API调用失败:`, error);

        // 发送错误事件
        const errorEvent = {
          event: "workflow_finished",
          task_id: "error-" + Date.now(),
          workflow_run_id: "error-" + Date.now(),
          data: {
            workflow_id: "error",
            progress: "100",
            result: [`病案拟题生成失败: ${error instanceof Error ? error.message : '未知错误'}`],
            elapsed_time: "0",
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
 * 调用Dify API执行病案报告工作流
 */
export async function callDifyCaseReportAPI(
  config: DifyAPIConfig,
  request: GenerateCaseReportRequest
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // 准备请求Dify API的数据
        const difyRequestBody = {
          inputs: {
            summary: request.summary,
            title: request.title
          },
          response_mode: "streaming",
          user: request.userid
        };

        console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - 用户: ${request.userid}`);
        console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - URL: ${config.apiUrl}/workflows/run`);
        console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - 标题: ${request.title.substring(0, 50)}...`);

        // 调用Dify API
        const response = await fetch(`${config.apiUrl}/workflows/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(difyRequestBody)
        });

        console.log(`[${new Date().toISOString()}] 病案报告Dify API响应状态: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          throw new Error(`病案报告Dify API 请求失败: ${response.status} ${response.statusText}`);
        }

        // 处理SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取病案报告Dify API响应');
        }

        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let collectedTextChunks: string[] = [];
        let workflowFinished = false;

        console.log(`[${new Date().toISOString()}] 开始处理病案报告Dify API响应流`);

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[${new Date().toISOString()}] 病案报告Dify API响应流结束`);
            break;
          }

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');

          console.log(`[${new Date().toISOString()}] 接收病案报告Dify数据: ${chunk.replace(/\n/g, '\\n')}`);

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.substring(6));

                console.log(`[${new Date().toISOString()}] 接收到病案报告事件: ${eventData.event || 'unknown'}`);

                // 提取ID信息
                if (eventData.task_id) lastTaskId = eventData.task_id;
                if (eventData.workflow_run_id) lastWorkflowRunId = eventData.workflow_run_id;
                if (eventData.data?.workflow_id) workflowId = eventData.data.workflow_id;

                if (eventData.event === 'workflow_started') {
                  const startEvent = {
                    event: "workflow_started",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress: "0",
                      status: "running",
                      title: "开始生成病案报告"
                    }
                  };

                  console.log(`[${new Date().toISOString()}] 发送病案报告开始事件`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                }
                else if (eventData.event === 'node_started' || eventData.event === 'node_finished') {
                  // 简单的进度更新
                  const progress = eventData.event === 'node_started' ? "30" : "60";
                  const title = eventData.event === 'node_started' ? "分析病案内容" : "生成报告中";

                  const progressEvent = {
                    event: "workflow_running",
                    task_id: lastTaskId,
                    workflow_run_id: lastWorkflowRunId,
                    data: {
                      workflow_id: workflowId,
                      progress,
                      status: "running",
                      title
                    }
                  };

                  console.log(`[${new Date().toISOString()}] 发送病案报告进度更新: ${progress}%`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                }
                else if (eventData.event === 'text_chunk') {
                  console.log(`[${new Date().toISOString()}] 接收到病案报告文本块`);

                  if (eventData.data && eventData.data.text) {
                    const text = String(eventData.data.text);
                    collectedTextChunks.push(text);

                    const textChunkEvent = {
                      event: "text_chunk",
                      task_id: lastTaskId,
                      workflow_run_id: lastWorkflowRunId,
                      data: {
                        text,
                        title: "生成病案报告中"
                      }
                    };

                    console.log(`[${new Date().toISOString()}] 转发病案报告文本块: ${text.substring(0, 50)}...`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
                  }
                }
                else if (eventData.event === 'workflow_finished') {
                  console.log(`[${new Date().toISOString()}] 病案报告工作流完成`);
                  workflowFinished = true;

                  // 解析结果
                  let result: string[] = [];

                  console.log(`[${new Date().toISOString()}] 病案报告完成事件原始数据:`, JSON.stringify(eventData.data, null, 2));

                  if (eventData.data && eventData.data.outputs) {
                    const outputs = eventData.data.outputs;
                    console.log(`[${new Date().toISOString()}] 病案报告outputs结构:`, JSON.stringify(outputs, null, 2));

                    if (outputs.text) {
                      result = [String(outputs.text)];
                      console.log(`[${new Date().toISOString()}] 从outputs.text获取结果: ${result[0].length} 字符`);
                    } else if (outputs.result) {
                      result = Array.isArray(outputs.result) ? outputs.result : [String(outputs.result)];
                      console.log(`[${new Date().toISOString()}] 从outputs.result获取结果: ${result.length} 项`);
                    } else {
                      // 尝试获取outputs中的第一个字符串值
                      const outputKeys = Object.keys(outputs);
                      console.log(`[${new Date().toISOString()}] outputs可用字段:`, outputKeys);
                      for (const key of outputKeys) {
                        if (typeof outputs[key] === 'string' && outputs[key].trim().length > 0) {
                          result = [String(outputs[key])];
                          console.log(`[${new Date().toISOString()}] 从outputs.${key}获取结果: ${result[0].length} 字符`);
                          break;
                        }
                      }
                    }

                    console.log(`[${new Date().toISOString()}] 解析到病案报告结果: ${result.length} 项`);
                  } else {
                    console.log(`[${new Date().toISOString()}] 没有找到outputs数据`);
                  }

                  // 如果没有从outputs获取到结果，使用收集的文本块
                  if (result.length === 0 && collectedTextChunks.length > 0) {
                    result = [collectedTextChunks.join('')];
                    console.log(`[${new Date().toISOString()}] 使用收集的文本块作为结果: ${result[0].length} 字符`);
                  }

                  // 如果还是没有结果，记录警告
                  if (result.length === 0) {
                    console.log(`[${new Date().toISOString()}] 警告: 没有获取到任何结果内容`);
                    result = ['未能获取到生成的病案报告内容'];
                  }

                  // 发送完成事件
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

                  console.log(`[${new Date().toISOString()}] 发送病案报告完成事件`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                }
              } catch (e) {
                console.error(`[${new Date().toISOString()}] 解析病案报告事件数据时出错:`, e);
              }
            }
          }
        }

        // 流结束后检查是否已发送完成事件
        if (!workflowFinished) {
          console.log(`[${new Date().toISOString()}] 流结束但未收到workflow_finished事件，手动发送完成事件`);

          // 使用收集的文本块作为结果
          const result = collectedTextChunks.length > 0 ? [collectedTextChunks.join('')] : ['病案报告生成完成'];

          const finishEvent = {
            event: "workflow_finished",
            task_id: lastTaskId || "manual-finish-" + Date.now(),
            workflow_run_id: lastWorkflowRunId || "manual-finish-" + Date.now(),
            data: {
              workflow_id: workflowId,
              progress: "100",
              result,
              elapsed_time: "0",
              status: "succeeded"
            }
          };

          console.log(`[${new Date().toISOString()}] 发送手动完成事件，结果长度: ${result[0].length} 字符`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
        }

      } catch (error: unknown) {
        console.log(`[${new Date().toISOString()}] 病案报告Dify API调用失败:`, error);

        // 发送错误事件
        const errorEvent = {
          event: "workflow_finished",
          task_id: "error-" + Date.now(),
          workflow_run_id: "error-" + Date.now(),
          data: {
            workflow_id: "error",
            progress: "100",
            result: [`病案报告生成失败: ${error instanceof Error ? error.message : '未知错误'}`],
            elapsed_time: "0",
            status: "failed"
          }
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
      }

      controller.close();
    }
  });
}