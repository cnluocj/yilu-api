import { GenerateTitlesRequest, GenerateArticleRequest, DifyAPIConfig } from '@/types';
import { DifyAPIClient } from '../core/api-client';
import { SSEStreamProcessor } from '../core/stream-processor';
import { SSEProcessorConfig } from '../utils/types';

/**
 * 科普文章服务
 * 处理标题生成和文章生成功能
 */
export class ArticleService {
  private apiClient: DifyAPIClient;

  constructor(private config: DifyAPIConfig) {
    this.apiClient = new DifyAPIClient(config);
  }

  /**
   * 生成标题API
   * 重构自原有的callDifyWorkflowAPI函数
   */
  async generateTitles(request: GenerateTitlesRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    
    return new ReadableStream({
      async start(controller) {
        try {
          console.log(`[${new Date().toISOString()}] 开始处理Dify API响应流`);

          // 使用基础API客户端调用工作流
          const response = await apiClient.callWorkflowAPI(
            { direction: request.direction },
            request.userid
          );

          if (!response.body) {
            throw new Error('无法读取Dify API响应');
          }

          // 配置SSE处理器
          const processorConfig: SSEProcessorConfig = {
            progress: {
              totalSteps: 9, // 默认总步数为9步
              maxProgress: 99,
              pingIncrement: 1,
              nodeIncrement: 2,
              textChunkIncrement: 2
            }
          };

          // 创建流处理器
          const processor = new SSEStreamProcessor(processorConfig, controller);
          
          // 处理SSE流
          const reader = response.body.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[${new Date().toISOString()}] Dify API响应流结束`);
              break;
            }
            
            const chunk = new TextDecoder().decode(value);
            await processor.processChunk(chunk);
          }
          
        } catch (error: unknown) {
          const processor = new SSEStreamProcessor(
            { progress: { totalSteps: 9, maxProgress: 99, pingIncrement: 1, nodeIncrement: 2, textChunkIncrement: 2 } },
            controller
          );
          processor.handleError(error);
        }
        
        controller.close();
      }
    });
  }

  /**
   * 生成文章API
   * 完全按照原来的逻辑重新实现
   */
  async generateArticle(request: GenerateArticleRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    const config = this.config; // 保存config引用

    return new ReadableStream({
      async start(controller) {
        let animationIntervalId: NodeJS.Timeout | null = null;
        let isWorkflowRunning = false;
        
        // 状态变量 - 完全按照原来的逻辑
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let lastProgress = 0;
        let lastSentTitle: string = '开始生成文章';
        let lastEmojiPair: string[] = ['⏳', '⚙️'];
        let currentEmojiIndex = 0;
        let currentEllipsisIndex = 0;
        const ellipsisStates = ['.', '..', '...'];
        
        // 标题映射 - 完全按照原来的配置
        const titleMapping: Record<string, { title: string; emojiPair: string[] }> = {
          "初步分析 (LLM)": { title: "拟题分析中", emojiPair: ['🤔', '🧐'] },
          "[工具] 参考文献抓取": { title: "阅读参考文献中", emojiPair: ['📖', '📚'] },
          "(学会)[工具] 参考文献抓取": { title: "阅读参考文献中", emojiPair: ['📖', '📚'] },
          "(必读)[工具] 参考文章概要浓缩": { title: "阅读参考文章中", emojiPair: ['📖', '📚'] },
          "初版文章生成 (LLM)": { title: "文章撰写中", emojiPair: ['✍️', '📝'] },
          "格式优化 (LLM)": { title: "文章格式美化中", emojiPair: ['✨', '💅'] }
        };
        const defaultEmojiPair = ['⏳', '⚙️'];

        // 定时器函数 - 完全按照原来的逻辑
        const startAnimationTimer = () => {
          if (animationIntervalId) clearInterval(animationIntervalId);
          
          animationIntervalId = setInterval(() => {
            if (!isWorkflowRunning) {
              if (animationIntervalId) clearInterval(animationIntervalId);
              animationIntervalId = null;
              return;
            }
            
            // 构建带emoji和省略号的标题
            const emojiPrefix = (lastEmojiPair && lastEmojiPair.length >= 2) ? `${lastEmojiPair[currentEmojiIndex]} ` : '';
            const ellipsisSuffix = ellipsisStates[currentEllipsisIndex];
            const displayTitle = `${emojiPrefix}${lastSentTitle}${ellipsisSuffix}`;
            
            // 切换emoji索引
            currentEmojiIndex = (currentEmojiIndex + 1) % 2;
            // 循环省略号索引
            currentEllipsisIndex = (currentEllipsisIndex + 1) % ellipsisStates.length;

            const progressEvent = {
              event: "workflow_running",
              task_id: lastTaskId,
              workflow_run_id: lastWorkflowRunId,
              data: {
                workflow_id: workflowId,
                progress: lastProgress.toString(),
                status: "running",
                title: displayTitle
              }
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));

          }, 600); // 600ms间隔
        };

        // 停止动画定时器
        const stopAnimationTimer = () => {
          isWorkflowRunning = false;
          if (animationIntervalId) {
            clearInterval(animationIntervalId);
            animationIntervalId = null;
          }
        };

        try {
          console.log('🚀 [NEW ARCHITECTURE] ArticleService.generateArticle() 正在使用重构后的代码');
          
          // 调用API
          const response = await apiClient.callWorkflowAPI(
            {
              author: request.name,
              unit: request.unit,
              direction: request.direction,
              subject: request.title,
              word_count: request.word_count,
              style: request.style || '生动有趣，角度新颖',
              journal: request.journal || '健康向导',
              outline: request.outline || ''
            },
            request.userid
          );

          if (!response.body) {
            throw new Error('无法读取生成文章Dify API响应');
          }

          // 处理SSE流 - 完全按照原来的逻辑
          const reader = response.body.getReader();
          const TOTAL_STEPS = 19; // 文章生成一共有19步
          let finishedSteps = 0;
          let buffer = '';
          
          console.log(`[${new Date().toISOString()}] 开始处理生成文章Dify API响应流`);

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[${new Date().toISOString()}] 生成文章Dify API响应流结束`);
              stopAnimationTimer();
              
              // 处理缓冲区剩余数据
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
            buffer += chunk;
            
            console.log(`[${new Date().toISOString()}] 接收生成文章Dify数据: ${chunk.replace(/\n/g, '\\n')}`);
            
            // 提取完整的SSE事件
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events.filter(e => e.trim() !== '')) {
              // Ping事件处理
              if (event.trim() === 'event: ping') {
                console.log(`[${new Date().toISOString()}] Ping received.`);
                if (lastProgress < 99) {
                  const newProgress = Math.min(lastProgress + 1, 99);
                  if (newProgress > lastProgress) {
                    console.log(`[${new Date().toISOString()}] Progress updated by ping: ${newProgress}%`);
                    lastProgress = newProgress;
                  }
                }
                continue;
              }
              
              if (event.startsWith('data: ')) {
                try {
                  processEvent(event);
                } catch (e) {
                  console.error(`[${new Date().toISOString()}] 处理事件时出错:`, e);
                }
              } else {
                console.log(`[${new Date().toISOString()}] 忽略非标准SSE行: ${event}`);
              }
            }
          }

          // 事件处理函数 - 完全按照原来的逻辑
          function processEvent(event: string) {
            if (!event.startsWith('data: ')) {
              console.warn('processEvent called with non-data event:', event);
              return;
            }
            
            try {
              const jsonStr = event.substring(6);
              let eventData: any = {};
              
              try {
                eventData = JSON.parse(jsonStr);
              } catch (jsonError) {
                console.error(`[${new Date().toISOString()}] JSON解析错误:`, jsonError);
                return;
              }
              
              // 更新状态ID
              if (eventData.task_id) {
                lastTaskId = eventData.task_id;
              }
              if (eventData.workflow_run_id) {
                lastWorkflowRunId = eventData.workflow_run_id;
              }
              
              // 处理不同事件类型
              if (eventData.event === 'workflow_started') {
                // 提取workflowId
                if (eventData.data?.workflow_id) {
                  workflowId = String(eventData.data.workflow_id);
                } else if (eventData.data?.inputs?.['sys.workflow_id']) {
                  const inputWorkflowId = eventData.data.inputs['sys.workflow_id'];
                  workflowId = typeof inputWorkflowId === 'string' ? inputWorkflowId : String(inputWorkflowId);
                } else {
                  workflowId = "";
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
                    title: lastSentTitle
                  }
                };
                
                console.log(`[${new Date().toISOString()}] 发送生成文章开始事件: ${JSON.stringify(startEvent)}`);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                
                lastProgress = 0;
                lastSentTitle = '开始生成文章';
                lastEmojiPair = defaultEmojiPair;
                currentEmojiIndex = 0;
                currentEllipsisIndex = 0;
                isWorkflowRunning = true;
                startAnimationTimer();
              }
              else if (eventData.event === 'node_finished') {
                finishedSteps += 1;
                const progressPercent = Math.min(Math.floor((finishedSteps / TOTAL_STEPS) * 100), 99);
                if (progressPercent > lastProgress) {
                  console.log(`[${new Date().toISOString()}] Progress updated by node_finished: ${progressPercent}%`);
                  lastProgress = progressPercent;
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
                    currentEmojiIndex = 0;
                    currentEllipsisIndex = 0;
                    
                    // 立即发送状态更新
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
                        title: displayTitle
                      }
                    };
                    console.log(`[${new Date().toISOString()}] Sending immediate progress update for mapped node start: ${lastProgress}% - ${displayTitle}`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                    
                    // 更新索引
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
                      title: lastSentTitle // 🎯 使用当前步骤的标题
                    }
                  };
                  
                  const textContent = typeof eventData.data.text === 'string' ? eventData.data.text : String(eventData.data.text);
                  console.log(`[${new Date().toISOString()}] 转发文本块事件: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
                }
              }
              else if (eventData.event === 'workflow_finished') {
                console.log(`[${new Date().toISOString()}] 生成文章工作流完成`);
                stopAnimationTimer();
                lastProgress = 100;

                try {
                  // 如果在workflow_finished事件中可以获取workflowId，则更新
                  if (eventData.data && eventData.data.workflow_id && !workflowId) {
                    workflowId = eventData.data.workflow_id;
                    console.log(`[${new Date().toISOString()}] 从完成事件获取生成文章workflowId: ${workflowId}`);
                  }

                  // 处理文件URL
                  const files: Array<{url: string; saved?: boolean; saveError?: string}> = [];

                  // 如果eventData中已经包含提取的文件，直接使用
                  if (eventData.data?.files && Array.isArray(eventData.data.files) && eventData.data.files.length > 0) {
                    console.log(`[${new Date().toISOString()}] 使用预提取的文件: ${JSON.stringify(eventData.data.files)}`);
                    // 不直接使用预提取的files，而是确保URL正确拼接
                    eventData.data.files.forEach((file: any) => {
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
                        eventData.data.files.forEach((file: any) => {
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
                        eventData.data.files.forEach((file: any) => {
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
                      const jsonStr = JSON.stringify(eventData);
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
              console.error(`[${new Date().toISOString()}] 处理事件时出错:`, e);
            }
          }
          
        } catch (error: unknown) {
          stopAnimationTimer();
          console.error(`[${new Date().toISOString()}] 调用生成文章Dify API时出错:`, error);
          
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          const errorEvent = {
            event: "workflow_finished",
            task_id: "error-" + Date.now(),
            workflow_run_id: "error-" + Date.now(),
            data: {
              workflow_id: "",
              progress: "100",
              result: [`调用生成文章Dify API时出错: ${errorMessage}`],
              status: "failed"
            }
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        }
        
        controller.close();
      }
    });
  }
}