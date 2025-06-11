import { GenerateCaseSummaryRequest, GenerateCaseTopicRequest, GenerateCaseReportRequest, DifyAPIConfig } from '@/types';
import { DifyAPIClient } from '../core/api-client';
import { SSEStreamProcessor } from '../core/stream-processor';
import { SSEProcessorConfig, FileData } from '../utils/types';

/**
 * 病案服务
 * 处理病案摘要、拟题、报告生成功能
 */
export class CaseService {
  private apiClient: DifyAPIClient;

  constructor(private config: DifyAPIConfig) {
    this.apiClient = new DifyAPIClient(config);
  }

  /**
   * 生成病案摘要API
   * 重构自原有的callDifyCaseSummaryAPI函数
   */
  async generateCaseSummary(request: GenerateCaseSummaryRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    
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
              const uploadFileId = await apiClient.uploadFile(file);
              uploadedFileIds.push(uploadFileId);
              console.log(`[${new Date().toISOString()}] 文件 ${file.name} 上传成功，ID: ${uploadFileId}`);
            } catch (uploadError) {
              console.error(`[${new Date().toISOString()}] 文件 ${file.name} 上传失败:`, uploadError);
              const errorMessage = uploadError instanceof Error ? uploadError.message : '未知错误';
              throw new Error(`文件上传失败: ${errorMessage}`);
            }
          }

          // 第二步：准备工作流请求参数
          const fileList: FileData[] = uploadedFileIds.map(uploadFileId => ({
            type: 'image',
            transfer_method: 'local_file',
            upload_file_id: uploadFileId
          }));

          const inputs = {
            name: request.name,
            unit: request.unit,
            files: fileList
          };

          console.log(`[${new Date().toISOString()}] 准备工作流请求参数:`, JSON.stringify(inputs, null, 2));

          // 配置SSE处理器
          const processorConfig: SSEProcessorConfig = {
            progress: {
              totalSteps: 5, // 病案摘要相对简单
              maxProgress: 99,
              pingIncrement: 1,
              nodeIncrement: 3,
              textChunkIncrement: 2
            }
          };

          // 创建流处理器
          const processor = new SSEStreamProcessor(processorConfig, controller);

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流
          const reader = response.body.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[${new Date().toISOString()}] 病案总结响应流结束`);
              break;
            }
            
            const chunk = new TextDecoder().decode(value);
            await processor.processChunk(chunk);
          }
          
        } catch (error: unknown) {
          const processor = new SSEStreamProcessor(
            { progress: { totalSteps: 5, maxProgress: 99, pingIncrement: 1, nodeIncrement: 3, textChunkIncrement: 2 } },
            controller
          );
          processor.handleError(error);
        }
        
        controller.close();
      }
    });
  }

  /**
   * 生成病案拟题API
   * 重构自原有的callDifyCaseTopicAPI函数
   */
  async generateCaseTopic(request: GenerateCaseTopicRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    const config = this.config; // 保存配置引用
    
    return new ReadableStream({
      async start(controller) {
        try {
          console.log(`[${new Date().toISOString()}] 开始病案拟题工作流 - 用户: ${request.userid}`);
          console.log(`[${new Date().toISOString()}] 病案总结长度: ${request.summary.length} 字符`);

          // 准备工作流请求参数
          const inputs = {
            summary: request.summary,
            ...(request.ext && { ext: request.ext })
          };

          console.log(`[${new Date().toISOString()}] 调用病案拟题工作流API - URL: ${config.apiUrl}/workflows/run`);

          // 配置SSE处理器
          const processorConfig: SSEProcessorConfig = {
            progress: {
              totalSteps: 3, // 病案拟题比较简单
              maxProgress: 99,
              pingIncrement: 1,
              nodeIncrement: 5,
              textChunkIncrement: 3
            }
          };

          // 创建流处理器
          const processor = new SSEStreamProcessor(processorConfig, controller);

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流
          const reader = response.body.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[${new Date().toISOString()}] 病案拟题响应流结束`);
              break;
            }
            
            const chunk = new TextDecoder().decode(value);
            await processor.processChunk(chunk);
          }
          
        } catch (error: unknown) {
          const processor = new SSEStreamProcessor(
            { progress: { totalSteps: 3, maxProgress: 99, pingIncrement: 1, nodeIncrement: 5, textChunkIncrement: 3 } },
            controller
          );
          processor.handleError(error);
        }
        
        controller.close();
      }
    });
  }

  /**
   * 生成病案报告API
   * 重构自原有的callDifyCaseReportAPI函数
   */
  async generateCaseReport(request: GenerateCaseReportRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    
    return new ReadableStream({
      async start(controller) {
        try {
          console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - 用户: ${request.userid}`);
          console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - 标题: ${request.title.substring(0, 50)}...`);

          // 准备工作流请求参数
          const inputs = {
            summary: request.summary,
            title: request.title
          };

          // 配置SSE处理器
          const processorConfig: SSEProcessorConfig = {
            progress: {
              totalSteps: 6, // 病案报告中等复杂度
              maxProgress: 99,
              pingIncrement: 1,
              nodeIncrement: 3,
              textChunkIncrement: 2
            }
          };

          // 创建流处理器
          const processor = new SSEStreamProcessor(processorConfig, controller);

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流
          const reader = response.body.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[${new Date().toISOString()}] 病案报告响应流结束`);
              break;
            }
            
            const chunk = new TextDecoder().decode(value);
            await processor.processChunk(chunk);
          }
          
        } catch (error: unknown) {
          const processor = new SSEStreamProcessor(
            { progress: { totalSteps: 6, maxProgress: 99, pingIncrement: 1, nodeIncrement: 3, textChunkIncrement: 2 } },
            controller
          );
          processor.handleError(error);
        }
        
        controller.close();
      }
    });
  }
}