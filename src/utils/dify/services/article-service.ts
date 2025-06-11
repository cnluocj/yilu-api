import { GenerateTitlesRequest, GenerateArticleRequest, DifyAPIConfig } from '@/types';
import { DifyAPIClient } from '../core/api-client';
import { SSEStreamProcessor } from '../core/stream-processor';
import { AnimationManager } from '../core/animation-manager';
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
   * 重构自原有的callDifyGenerateArticleAPI函数
   */
  async generateArticle(request: GenerateArticleRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    
    return new ReadableStream({
      async start(controller) {
        let animationManager: AnimationManager | null = null;
        let isWorkflowRunning = false;
        
        try {
          console.log('🚀 [NEW ARCHITECTURE] ArticleService.generateArticle() 正在使用重构后的代码');
          // 文章生成的标题映射配置
          const titleMapping: Record<string, { title: string; emojiPair: string[] }> = {
            "初步分析 (LLM)": { title: "拟题分析中", emojiPair: ['🤔', '🧐'] },
            "[工具] 参考文献抓取": { title: "阅读参考文献中", emojiPair: ['📖', '📚'] },
            "(学会)[工具] 参考文献抓取": { title: "阅读参考文献中", emojiPair: ['📖', '📚'] },
            "(必读)[工具] 参考文章概要浓缩": { title: "阅读参考文章中", emojiPair: ['📖', '📚'] },
            "初版文章生成 (LLM)": { title: "文章撰写中", emojiPair: ['✍️', '📝'] },
            "格式优化 (LLM)": { title: "文章格式美化中", emojiPair: ['✨', '💅'] }
          };

          // 先创建处理器配置，后面再创建动画管理器
          let processor: SSEStreamProcessor;

          // 配置SSE处理器，包含文章生成的特殊逻辑
          const processorConfig: SSEProcessorConfig = {
            progress: {
              totalSteps: 10, // 文章生成步数更多
              maxProgress: 99,
              pingIncrement: 1,
              nodeIncrement: 2,
              textChunkIncrement: 2
            },
            enableAnimation: true,
            customEventHandlers: {
              // 自定义node_started处理，更新动画标题
              'node_started': (eventData, state) => {
                if (eventData.data?.node_title && animationManager) {
                  animationManager.updateTitle(eventData.data.node_title);
                  if (!isWorkflowRunning) {
                    isWorkflowRunning = true;
                    animationManager.startAnimation();
                  }
                }
                return null; // 返回null表示使用默认处理
              },
              // 自定义workflow_finished处理，停止动画
              'workflow_finished': (eventData, state) => {
                isWorkflowRunning = false;
                if (animationManager) {
                  animationManager.stopAnimation();
                }
                return null; // 返回null表示使用默认处理
              }
            }
          };

          // 创建流处理器
          processor = new SSEStreamProcessor(processorConfig, controller);

          // 创建动画管理器
          animationManager = new AnimationManager(
            titleMapping,
            ['⏳', '⚙️'], // 默认emoji对
            (animatedTitle: string) => {
              // 动画更新回调 - 发送带动画的进度事件
              const state = processor.getState();
              const progressEvent = {
                event: "workflow_running",
                task_id: state.taskId,
                workflow_run_id: state.workflowRunId,
                data: {
                  workflow_id: state.workflowId,
                  progress: state.progress.toString(),
                  status: "running",
                  title: animatedTitle
                }
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
            }
          );

          // 调用文章生成API
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
            throw new Error('无法读取Dify API响应');
          }

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
          if (animationManager) {
            animationManager.stopAnimation();
          }
          
          const processor = new SSEStreamProcessor(
            { progress: { totalSteps: 10, maxProgress: 99, pingIncrement: 1, nodeIncrement: 2, textChunkIncrement: 2 } },
            controller
          );
          processor.handleError(error);
        }
        
        // 清理资源
        if (animationManager) {
          animationManager.destroy();
        }
        controller.close();
      }
    });
  }
}