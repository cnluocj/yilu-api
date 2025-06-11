import { GenerateCaseSummaryRequest, GenerateCaseTopicRequest, GenerateCaseReportRequest, DifyAPIConfig } from '@/types';
import { DifyAPIClient } from '../core/api-client';
import { FileData } from '../utils/types';

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
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let lastProgress = 0;
        let workflowFinished = false;
        let collectedTextChunks: string[] = [];

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

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流 - 使用原有的详细逻辑
          const reader = response.body.getReader();

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
   * 生成病案拟题API
   * 重构自原有的callDifyCaseTopicAPI函数
   */
  async generateCaseTopic(request: GenerateCaseTopicRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用
    const config = this.config; // 保存配置引用

    return new ReadableStream({
      async start(controller) {
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let workflowFinished = false;
        let collectedTextChunks: string[] = [];

        try {
          console.log(`[${new Date().toISOString()}] 开始病案拟题工作流 - 用户: ${request.userid}`);
          console.log(`[${new Date().toISOString()}] 病案总结长度: ${request.summary.length} 字符`);

          // 准备工作流请求参数
          const inputs = {
            summary: request.summary,
            ...(request.ext && { ext: request.ext })
          };

          console.log(`[${new Date().toISOString()}] 调用病案拟题工作流API - URL: ${config.apiUrl}/workflows/run`);

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流 - 使用原有的详细逻辑
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

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
   * 生成病案报告API
   * 重构自原有的callDifyCaseReportAPI函数
   */
  async generateCaseReport(request: GenerateCaseReportRequest): Promise<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder();
    const apiClient = this.apiClient; // 保存this引用

    return new ReadableStream({
      async start(controller) {
        let lastTaskId = '';
        let lastWorkflowRunId = '';
        let workflowId = '';
        let collectedTextChunks: string[] = [];
        let workflowFinished = false;

        try {
          console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - 用户: ${request.userid}`);
          console.log(`[${new Date().toISOString()}] 请求病案报告Dify API - 标题: ${request.title.substring(0, 50)}...`);

          // 准备工作流请求参数
          const inputs = {
            summary: request.summary,
            title: request.title
          };

          // 调用工作流API
          const response = await apiClient.callWorkflowAPI(inputs, request.userid);

          if (!response.body) {
            throw new Error('响应体为空');
          }

          // 处理SSE流 - 使用原有的详细逻辑
          const reader = response.body.getReader();

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
}