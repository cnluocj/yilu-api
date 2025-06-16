import { GenerateThesisOutlineRequest, DifyAPIConfig } from '@/types';
import { DifyAPIClient } from '../core/api-client';

/**
 * 论文服务
 * 处理医学硕博论文大纲生成功能
 */
export class ThesisService {
  private apiClient: DifyAPIClient;

  constructor(private config: DifyAPIConfig) {
    this.apiClient = new DifyAPIClient(config);
  }

  /**
   * 生成论文大纲API
   * 独立实现论文大纲生成功能
   */
  async generateThesisOutline(request: GenerateThesisOutlineRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用

    return new ReadableStream({
      async start(controller) {
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let workflowFinished = false;
        let collectedTextChunks: string[] = [];

        try {
          console.log(`[${new Date().toISOString()}] 开始论文大纲生成工作流 - 用户: ${request.userid}`);
          console.log(`[${new Date().toISOString()}] 论文标题: ${request.title}`);
          console.log(`[${new Date().toISOString()}] 研究模型: ${request.model.substring(0, 100)}...`);
          console.log(`[${new Date().toISOString()}] 预期字数: ${request.word_count}`);

          // 准备工作流请求参数
          const inputs = {
            title: request.title,
            model: request.model,
            word_count: request.word_count
          };

          console.log(`[${new Date().toISOString()}] 调用论文大纲工作流API`);

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          console.log(`[${new Date().toISOString()}] 开始处理论文大纲Dify API响应流`);

          // 读取SSE流
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[${new Date().toISOString()}] 论文大纲Dify API响应流结束`);
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === 'event: ping') {
                // 处理ping事件，缓慢增加进度
                console.log(`[${new Date().toISOString()}] 收到ping事件`);
                continue;
              } else if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.substring(6));
                  console.log(`[${new Date().toISOString()}] 论文大纲Dify事件:`, eventData.event);

                  // 处理不同类型的事件
                  if (eventData.event === 'workflow_started') {
                    console.log(`[${new Date().toISOString()}] 论文大纲工作流开始`);

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
                        title: "开始生成论文大纲"
                      }
                    };

                    console.log(`[${new Date().toISOString()}] 转发论文大纲开始事件`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
                  }
                  else if (eventData.event === 'workflow_running') {
                    console.log(`[${new Date().toISOString()}] 论文大纲工作流运行中`);

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
                        title: eventData.data?.title || "生成论文大纲中"
                      }
                    };

                    console.log(`[${new Date().toISOString()}] 转发论文大纲进度事件: ${progress}%`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressEvent)}\n\n`));
                  }
                  else if (eventData.event === 'text_chunk') {
                    console.log(`[${new Date().toISOString()}] 接收到论文大纲文本块`);

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
                          title: "生成论文大纲中"
                        }
                      };

                      console.log(`[${new Date().toISOString()}] 转发论文大纲文本块: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`);
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkEvent)}\n\n`));
                    }
                  }
                  else if (eventData.event === 'workflow_finished') {
                    console.log(`[${new Date().toISOString()}] 论文大纲工作流完成`);
                    workflowFinished = true;

                    // 解析结果
                    let result: string[] = [];

                    console.log(`[${new Date().toISOString()}] 论文大纲完成事件原始数据:`, JSON.stringify(eventData.data, null, 2));

                    if (eventData.data && eventData.data.outputs) {
                      // 查找输出中的大纲内容
                      const outputs = eventData.data.outputs;
                      console.log(`[${new Date().toISOString()}] 论文大纲outputs结构:`, JSON.stringify(outputs, null, 2));

                      if (outputs.text) {
                        result = [String(outputs.text)];
                        console.log(`[${new Date().toISOString()}] 从outputs.text获取结果: ${result[0].length} 字符`);
                      } else if (outputs.outline) {
                        result = [String(outputs.outline)];
                        console.log(`[${new Date().toISOString()}] 从outputs.outline获取结果: ${result[0].length} 字符`);
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

                      console.log(`[${new Date().toISOString()}] 解析到论文大纲结果: ${result.length} 项`);
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
                      result = ['未能获取到生成的论文大纲内容'];
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

                    console.log(`[${new Date().toISOString()}] 发送论文大纲完成事件`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`));
                  }
                } catch (e) {
                  console.error(`[${new Date().toISOString()}] 解析论文大纲Dify事件数据时出错:`, e);
                  console.error(`[${new Date().toISOString()}] 解析失败的数据: ${line.substring(6)}`);
                }
              }
            }
          }

          // 流结束后检查是否已发送完成事件
          if (!workflowFinished) {
            console.log(`[${new Date().toISOString()}] 流结束但未收到workflow_finished事件，手动发送完成事件`);

            // 使用收集的文本块作为结果
            const result = collectedTextChunks.length > 0 ? [collectedTextChunks.join('')] : ['论文大纲生成完成'];

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
          console.error(`[${new Date().toISOString()}] 调用论文大纲Dify API时出错:`, error);

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
              result: [`调用论文大纲Dify API时出错: ${errorMessage}`],
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
