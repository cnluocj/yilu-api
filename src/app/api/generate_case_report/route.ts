import { NextRequest, NextResponse } from 'next/server';
import { getCaseReportDifyConfig, callDifyCaseReportAPI } from '@/utils/dify';
import { ServiceType } from '@/types';
import { createTask, updateTaskStatus, addTaskEvent } from '@/utils/task-manager';
import type { GenerateCaseReportRequest } from '@/types';

export async function POST(request: NextRequest) {
  console.log(`[${new Date().toISOString()}] 接收到病案报告生成请求`);
  
  try {
    // 解析请求体
    const body = await request.json();
    const { userid, summary, title } = body;
    
    // 验证必需参数
    if (!userid || !summary || !title) {
      console.log(`[${new Date().toISOString()}] 缺少必需参数`);
      return NextResponse.json(
        { error: '缺少必需参数: userid, summary, title' },
        { status: 400 }
      );
    }
    
    // 验证参数长度
    if (summary.trim().length === 0) {
      console.log(`[${new Date().toISOString()}] 病案总结内容为空`);
      return NextResponse.json(
        { error: '病案总结内容不能为空' },
        { status: 400 }
      );
    }
    
    if (title.trim().length === 0) {
      console.log(`[${new Date().toISOString()}] 报告标题为空`);
      return NextResponse.json(
        { error: '报告标题不能为空' },
        { status: 400 }
      );
    }
    
    console.log(`[${new Date().toISOString()}] 病案报告请求参数 - 用户: ${userid}, 标题: ${title.substring(0, 50)}...`);
    
    // 病案报告功能目前处于测试阶段，跳过配额检查
    console.log(`[${new Date().toISOString()}] 病案报告测试阶段 - 跳过配额检查 - 用户: ${userid}`);
    
    // 创建任务
    const task = await createTask(userid, ServiceType.ALL);
    const taskId = task.id;

    console.log(`[${new Date().toISOString()}] 创建病案报告任务 - 任务ID: ${taskId}`);
    
    // 获取Dify配置
    const difyConfig = getCaseReportDifyConfig();
    console.log(`[${new Date().toISOString()}] 获取病案报告Dify配置成功`);

    // 构建请求对象
    const caseReportRequest: GenerateCaseReportRequest = {
      userid,
      summary: summary.trim(),
      title: title.trim()
    };
    
    // 创建SSE响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 测试阶段不消费配额
        
        try {
          // 调用Dify API
          const difyStream = await callDifyCaseReportAPI(difyConfig, caseReportRequest);
          const reader = difyStream.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // 解析事件数据以跟踪进度
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.substring(6));
                  
                  // 更新任务状态
                  if (eventData.event === 'workflow_started') {
                    await updateTaskStatus(userid, taskId, {
                      status: 'running' as any,
                      progress: 0,
                      statusTitle: '开始生成病案报告'
                    });
                  } else if (eventData.event === 'workflow_running') {
                    const progress = parseInt(eventData.data?.progress || '0');
                    await updateTaskStatus(userid, taskId, {
                      status: 'running' as any,
                      progress,
                      statusTitle: eventData.data?.title || '生成病案报告中'
                    });
                  } else if (eventData.event === 'workflow_finished') {
                    const success = eventData.data?.status !== 'failed';

                    if (success) {
                      // 测试阶段不消费配额
                      console.log(`[${new Date().toISOString()}] 病案报告成功（测试阶段，不消费配额） - 用户: ${userid}`);

                      await updateTaskStatus(userid, taskId, {
                        status: 'completed' as any,
                        progress: 100,
                        statusTitle: '病案报告完成'
                      });
                    } else {
                      await updateTaskStatus(userid, taskId, {
                        status: 'failed' as any,
                        progress: 100,
                        statusTitle: '病案报告失败'
                      });
                    }
                  }

                  // 记录事件到任务历史
                  await addTaskEvent(userid, taskId, eventData);
                } catch (e) {
                  console.error(`[${new Date().toISOString()}] 解析事件数据失败:`, e);
                }
              }
            }
            
            // 转发数据到客户端
            controller.enqueue(value);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 病案报告生成过程中出错:`, error);
          
          // 更新任务状态为失败
          await updateTaskStatus(userid, taskId, {
            status: 'failed' as any,
            progress: 100,
            statusTitle: '病案报告失败'
          });
          
          // 发送错误事件
          const errorEvent = {
            event: "workflow_finished",
            task_id: taskId,
            data: {
              progress: "100",
              result: [`病案报告生成失败: ${error instanceof Error ? error.message : '未知错误'}`],
              status: "failed"
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        }
        
        controller.close();
      }
    });
    
    // 返回SSE响应，包含任务ID
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Task-ID': taskId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'X-Task-ID'
      }
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 病案报告API处理请求时出错:`, error);
    
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        message: error instanceof Error ? error.message : '未知错误'
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
    }
  });
}
