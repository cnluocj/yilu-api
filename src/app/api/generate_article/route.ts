import { NextRequest, NextResponse } from 'next/server';
import { GenerateArticleRequest, WorkflowEvent, ServiceType } from '@/types';
import { callDifyGenerateArticleAPI, getArticleDifyConfig } from '@/utils/dify';
import { getUserQuota, consumeQuota } from '@/utils/quota'; // 引入配额管理功能，更新函数名
import { createTask, updateTaskStatus, TaskStatus, addTaskEvent } from '@/utils/task-manager';

// 用于在开发环境中使用的模拟数据
const mockResponseData: WorkflowEvent[] = [
  {
    event: "workflow_started",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "68e14b11-c091-4499-ae78-fb77c062ad73",
      progress: "0",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "68e14b11-c091-4499-ae78-fb77c062ad73",
      progress: "20",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "68e14b11-c091-4499-ae78-fb77c062ad73",
      progress: "40",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "68e14b11-c091-4499-ae78-fb77c062ad73",
      progress: "60",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "68e14b11-c091-4499-ae78-fb77c062ad73",
      progress: "80",
      status: "running"
    }
  },
  {
    event: "workflow_finished",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "68e14b11-c091-4499-ae78-fb77c062ad73",
      progress: "100",
      files: [
        {
          url: "http://sandboxai.jinzhibang.com.cn/files/tools/e4d272f1-3003-4c0a-a5e5-449c6d2ca48d.docx?timestamp=1743492930&nonce=e468bd528f2acc6c28b06728cc7ce8cd&sign=-oYdGyEXtIGREOguq35m_LsDfnSZYFxwzToPoSxxgfc="
        }
      ],
      elapsed_time: "12.5",
      status: "succeeded"
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到生成文章请求`);
    
    // 记录请求头部信息
    const userAgent = request.headers.get('user-agent') || '未知';
    console.log(`[${new Date().toISOString()}][${requestId}] User-Agent: ${userAgent}`);
    
    // 解析请求体
    const body: GenerateArticleRequest = await request.json();
    console.log(`[${new Date().toISOString()}][${requestId}] 请求参数: ${JSON.stringify(body)}`);
    
    // 验证请求数据（基本验证）
    if (!body.direction || !body.userid) {
      console.log(`[${new Date().toISOString()}][${requestId}] 验证失败: 缺少必要字段 (direction or userid)`);
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }
    
    // 获取是否使用模拟数据的环境变量（在开发环境中可用于调试）
    const useMockData = process.env.USE_MOCK_DATA === 'true';
    let skipQuotaCheck = process.env.SKIP_QUOTA_CHECK === 'true'; // 对于测试环境，可配置跳过配额检查

    // internal开头的是内部接口，不进行配额检查
    if (body.userid.startsWith('internal_')) {
      skipQuotaCheck = true;
    }

    // 保存配额信息，用于后续处理
    let quota = null;
    
    // 检查用户配额是否足够（跳过模拟数据模式）
    if (!useMockData && !skipQuotaCheck) {
      try {
        // 检查用户是否有足够的配额
        console.log(`[${new Date().toISOString()}][${requestId}] 检查用户(${body.userid})的文章生成服务配额`);
        quota = await getUserQuota(body.userid, ServiceType.ALL);
        
        if (!quota || quota.remaining_quota <= 0) {
          console.error(`[${new Date().toISOString()}][${requestId}] 用户(${body.userid})的文章生成服务配额不足`);
          return NextResponse.json(
            { error: '服务配额不足，请联系管理员添加配额' },
            { status: 403 }
          );
        }
        
        console.log(`[${new Date().toISOString()}][${requestId}] 用户(${body.userid})的文章生成服务配额充足，剩余: ${quota.remaining_quota}`);
      } catch (quotaError) {
        console.error(`[${new Date().toISOString()}][${requestId}] 检查配额时出错:`, quotaError);
        return NextResponse.json(
          { error: '检查服务配额时出错' },
          { status: 500 }
        );
      }
    }

    console.log(`[${new Date().toISOString()}][${requestId}] 使用模拟数据: ${useMockData}`);
    
    // 创建任务并获取任务ID
    const taskInfo = await createTask(body.userid, ServiceType.ALL);
    const taskId = taskInfo.id;
    
    // 设置流响应
    const encoder = new TextEncoder();
    let stream: ReadableStream<Uint8Array>;
    
    if (useMockData) {
      // 使用模拟数据进行响应
      console.log(`[${new Date().toISOString()}][${requestId}] 使用模拟数据响应, 任务ID: ${taskId}`);
      stream = new ReadableStream({
        async start(controller) {
          // 发送每个模拟数据项，添加延迟以模拟实时更新
          for (const item of mockResponseData) {
            // 添加任务ID到事件数据中
            const eventWithTaskId = {
              ...item,
              task_id: taskId
            };
            
            // 将事件保存到任务历史记录
            await addTaskEvent(body.userid, taskId, eventWithTaskId);
            
            const data = `data: ${JSON.stringify(eventWithTaskId)}\n\n`;
            controller.enqueue(encoder.encode(data));
            
            console.log(`[${new Date().toISOString()}][${requestId}] 发送模拟数据: ${JSON.stringify(item)}`);
            
            // 添加延迟以模拟服务器处理时间
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          console.log(`[${new Date().toISOString()}][${requestId}] 模拟数据发送完成`);
          controller.close();
        }
      });
    } else {
      // 使用实际的Dify API
      console.log(`[${new Date().toISOString()}][${requestId}] 准备调用生成文章Dify API, 任务ID: ${taskId}`);
      const config = getArticleDifyConfig();
      
      // 检查API密钥是否已配置
      if (!config.apiKey) {
        console.log(`[${new Date().toISOString()}][${requestId}] 错误: 生成文章Dify API密钥未配置`);
        
        // 创建一个错误事件并保存到任务历史
        await addTaskEvent(body.userid, taskId, {
          event: 'error',
          task_id: taskId,
          data: {
            error: '生成文章Dify API密钥未配置'
          }
        });
        
        return NextResponse.json(
          { error: '生成文章Dify API密钥未配置，请在环境变量中设置ARTICLE_DIFY_API_KEY' },
          { status: 500 }
        );
      }
      
      // 更新任务状态为进行中
      await updateTaskStatus(body.userid, taskId, {
        status: TaskStatus.RUNNING,
        progress: 0
      });
      
      // 调用Dify API并获取流响应
      console.log(`[${new Date().toISOString()}][${requestId}] 开始调用生成文章Dify API`);
      
      // 创建一个特殊的TransformStream来处理和解析Dify响应流
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // 调用Dify API并获取原始流
      const difyStream = await callDifyGenerateArticleAPI(config, body);
      
      // 使用reader读取原始流
      const reader = difyStream.getReader();
      
      // 创建一个解析器来跟踪和监控事件
      let fileCount = 0;
      let isWorkflowFinished = false;
      let buffer = '';
      
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // 如果有数据，先解码
            let chunk = new TextDecoder().decode(value);
            
            // 向每个事件添加任务ID并保存到事件历史
            if (chunk.includes('data:')) {
              const events = chunk.split('\n\n');
              const modifiedEvents = events.map(event => {
                if (event.startsWith('data:')) {
                  try {
                    const jsonStr = event.substring(5).trim();
                    const eventData = JSON.parse(jsonStr);
                    // 添加任务ID
                    eventData.task_id = taskId;
                    
                    // 异步保存事件到任务历史 (这里使用void处理Promise)
                    void addTaskEvent(body.userid, taskId, eventData);
                    
                    return `data: ${JSON.stringify(eventData)}`;
                  } catch (e) {
                    return event;
                  }
                }
                return event;
              });
              
              chunk = modifiedEvents.join('\n\n') + (chunk.endsWith('\n\n') ? '\n\n' : '');
              writer.write(encoder.encode(chunk));
            } else {
              writer.write(value);
            }
            
            // 同时解析数据以检测文件数量和更新任务状态
            buffer += chunk;
            
            // 处理事件并更新任务状态
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
              if (event.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(event.substring(6));
                  
                  // 检查是否是工作流完成事件
                  if (eventData.event === 'workflow_finished') {
                    isWorkflowFinished = true;
                    
                    if (eventData.data && eventData.data.files && Array.isArray(eventData.data.files)) {
                      fileCount = eventData.data.files.length;
                      console.log(`[${new Date().toISOString()}][${requestId}] 检测到工作流完成事件，文件数量: ${fileCount}`);
                      
                      // 当文件数量 > 0 且配额检查未被跳过时，扣除配额
                      if (fileCount > 0 && !skipQuotaCheck && quota) {
                        try {
                          console.log(`[${new Date().toISOString()}][${requestId}] 生成成功，文件数量: ${fileCount}，消耗用户(${body.userid})的一次文章生成服务配额`);
                          const remainingQuota = await consumeQuota(body.userid, ServiceType.ALL, `system-article-${requestId}`);
                          console.log(`[${new Date().toISOString()}][${requestId}] 配额消耗成功，剩余: ${remainingQuota}`);
                        } catch (quotaError) {
                          console.error(`[${new Date().toISOString()}][${requestId}] 消耗配额时出错:`, quotaError);
                          // 继续处理，不中断流
                        }
                      } else {
                        console.log(`[${new Date().toISOString()}][${requestId}] 不消耗配额，原因: ${skipQuotaCheck ? '跳过配额检查' : fileCount > 0 ? '' : '无文件生成'}`);
                      }
                    }
                  }
                } catch (e) {
                  console.error(`[${new Date().toISOString()}][${requestId}] 解析事件数据失败:`, e);
                }
              }
            }
          }
          
          // 最后再检查一次，以防漏检
          if (!isWorkflowFinished) {
            console.log(`[${new Date().toISOString()}][${requestId}] 流结束但未检测到工作流完成事件，不消耗配额`);
            
            // 添加一个错误事件到任务历史
            await addTaskEvent(body.userid, taskId, {
              event: 'error',
              task_id: taskId,
              data: {
                error: '生成文章超时或未返回结果'
              }
            });
          }
          
          // 关闭输出流
          writer.close();
        } catch (error) {
          console.error(`[${new Date().toISOString()}][${requestId}] 处理响应流时出错:`, error);
          
          // 添加一个错误事件到任务历史
          await addTaskEvent(body.userid, taskId, {
            event: 'error',
            task_id: taskId,
            data: {
              error: `处理响应流时出错: ${error instanceof Error ? error.message : '未知错误'}`
            }
          });
          
          writer.abort(error);
        }
      })();
      
      // 使用经过处理的流
      stream = readable;
    }

    // 在响应返回前记录日志
    console.log(`[${new Date().toISOString()}][${requestId}] 返回生成文章流响应，任务ID: ${taskId}`);
    
    // 返回流响应，同时包含任务ID
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId,
        'X-Task-ID': taskId // 在响应头中添加任务ID
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 生成文章API中出错:`, error);
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    );
  }
} 