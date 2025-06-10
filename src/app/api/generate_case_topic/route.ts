import { NextRequest, NextResponse } from 'next/server';
import { getCaseTopicDifyConfig, callDifyCaseTopicAPI } from '@/utils/dify';
import { ServiceType } from '@/types';
import { createTask, updateTaskStatus, addTaskEvent } from '@/utils/task-manager';
import type { GenerateCaseTopicRequest } from '@/types';

export async function POST(request: NextRequest) {
  console.log(`[${new Date().toISOString()}] 收到病案拟题请求`);

  try {
    // 解析请求体
    const body = await request.json();
    const { userid, summary, ext } = body;

    // 参数验证
    if (!userid) {
      console.log(`[${new Date().toISOString()}] 缺少必需参数: userid`);
      return NextResponse.json(
        { error: '缺少必需参数: userid' },
        { status: 400 }
      );
    }

    if (!summary) {
      console.log(`[${new Date().toISOString()}] 缺少必需参数: summary`);
      return NextResponse.json(
        { error: '缺少必需参数: summary' },
        { status: 400 }
      );
    }

    if (typeof summary !== 'string' || summary.trim().length === 0) {
      console.log(`[${new Date().toISOString()}] 病案总结内容不能为空`);
      return NextResponse.json(
        { error: '病案总结内容不能为空' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] 病案拟题请求参数验证通过 - 用户: ${userid}, 总结长度: ${summary.length} 字符`);

    // 病案拟题功能目前处于测试阶段，跳过配额检查
    console.log(`[${new Date().toISOString()}] 病案拟题测试阶段 - 跳过配额检查 - 用户: ${userid}`);

    // 获取Dify配置
    const difyConfig = getCaseTopicDifyConfig();
    console.log(`[${new Date().toISOString()}] 获取病案拟题Dify配置成功`);

    // 构建请求对象
    const caseTopicRequest: GenerateCaseTopicRequest = {
      userid,
      summary: summary.trim(),
      ...(ext && { ext })
    };

    // 创建任务
    const task = await createTask(userid, ServiceType.ALL);
    const taskId = task.id;
    
    console.log(`[${new Date().toISOString()}] 创建病案拟题任务 - 任务ID: ${taskId}`);

    // 创建SSE响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 测试阶段不消费配额
        
        try {
          // 调用Dify API
          const difyStream = await callDifyCaseTopicAPI(difyConfig, caseTopicRequest);
          const reader = difyStream.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // 转发数据到客户端
            controller.enqueue(value);
            
            // 解析事件数据用于任务状态更新
            try {
              const text = new TextDecoder().decode(value);
              const lines = text.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const eventData = JSON.parse(line.substring(6));
                  
                  // 更新任务状态
                  if (eventData.event === 'workflow_started') {
                    await updateTaskStatus(userid, taskId, {
                      status: 'running' as any,
                      progress: 0,
                      statusTitle: '开始生成题目'
                    });
                  } else if (eventData.event === 'workflow_running') {
                    const progress = parseInt(eventData.data?.progress || '0');
                    await updateTaskStatus(userid, taskId, {
                      status: 'running' as any,
                      progress,
                      statusTitle: eventData.data?.title || '生成题目中'
                    });
                  } else if (eventData.event === 'workflow_finished') {
                    const success = eventData.data?.status !== 'failed';
                    
                    if (success) {
                      // 测试阶段不消费配额
                      console.log(`[${new Date().toISOString()}] 病案拟题成功（测试阶段，不消费配额） - 用户: ${userid}`);

                      await updateTaskStatus(userid, taskId, {
                        status: 'completed' as any,
                        progress: 100,
                        statusTitle: '题目生成完成'
                      });
                    } else {
                      await updateTaskStatus(userid, taskId, {
                        status: 'failed' as any,
                        progress: 100,
                        statusTitle: '题目生成失败'
                      });
                    }
                  }
                  
                  // 记录事件到任务历史
                  await addTaskEvent(userid, taskId, eventData);
                }
              }
            } catch (parseError) {
              // 忽略解析错误，继续转发数据
              console.log(`[${new Date().toISOString()}] 解析事件数据失败，但继续转发:`, parseError);
            }
          }
          
          console.log(`[${new Date().toISOString()}] 病案拟题Dify API响应流处理完成`);
          
        } catch (error: unknown) {
          console.error(`[${new Date().toISOString()}] 病案拟题处理失败:`, error);
          
          // 更新任务状态为失败
          await updateTaskStatus(userid, taskId, {
            status: 'failed' as any,
            progress: 100,
            statusTitle: '题目生成失败'
          });
          
          // 发送错误事件
          const errorEvent = {
            event: "workflow_finished",
            task_id: taskId,
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

    // 设置响应头
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Task-ID': taskId,
    });

    console.log(`[${new Date().toISOString()}] 开始返回病案拟题SSE流 - 任务ID: ${taskId}`);
    
    return new NextResponse(stream, { headers });

  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] 病案拟题API处理失败:`, error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return NextResponse.json(
      { 
        error: '病案拟题生成失败',
        message: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
