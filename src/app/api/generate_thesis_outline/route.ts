import { NextRequest, NextResponse } from 'next/server';
import { getThesisOutlineDifyConfig, callDifyThesisOutlineAPI } from '@/utils/dify';
import { ServiceType } from '@/types';
import { createTask, updateTaskStatus, addTaskEvent } from '@/utils/task-manager';
import type { GenerateThesisOutlineRequest } from '@/types';

export async function POST(request: NextRequest) {
  console.log(`[${new Date().toISOString()}] 接收到论文大纲生成请求`);

  try {
    // 解析请求体
    const body: GenerateThesisOutlineRequest = await request.json();
    const { userid, title, model, word_count } = body;
    
    // 验证必需参数
    if (!userid || !title || !model || !word_count) {
      console.log(`[${new Date().toISOString()}] 论文大纲请求参数不完整`);
      return NextResponse.json(
        { 
          error: '请求参数不完整',
          message: '缺少必需的参数: userid, title, model, word_count'
        },
        { status: 400 }
      );
    }
    
    console.log(`[${new Date().toISOString()}] 论文大纲请求参数 - 用户: ${userid}, 标题: ${title.substring(0, 50)}...`);
    
    // 论文大纲功能目前处于测试阶段，跳过配额检查
    console.log(`[${new Date().toISOString()}] 论文大纲测试阶段 - 跳过配额检查 - 用户: ${userid}`);
    
    // 创建任务
    const task = await createTask(userid, ServiceType.GENERATE_THESIS_OUTLINE);
    const taskId = task.id;

    console.log(`[${new Date().toISOString()}] 创建论文大纲任务 - 任务ID: ${taskId}`);
    
    // 获取Dify配置
    const difyConfig = getThesisOutlineDifyConfig();
    console.log(`[${new Date().toISOString()}] 获取论文大纲Dify配置成功`);

    // 构建请求对象
    const thesisOutlineRequest: GenerateThesisOutlineRequest = {
      userid,
      title: title.trim(),
      model: model.trim(),
      word_count: Number(word_count)
    };
    
    // 创建SSE响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 测试阶段不消费配额
        console.log(`[${new Date().toISOString()}] 论文大纲测试阶段 - 不消费配额 - 用户: ${userid}`);
        
        try {
          // 更新任务状态为运行中
          await updateTaskStatus(userid, taskId, {
            status: 'running' as any,
            progress: 0
          });

          // 发送开始事件
          const startEvent = {
            event: 'workflow_started',
            task_id: taskId,
            workflow_run_id: `thesis_outline_${taskId}`,
            data: {
              workflow_id: `thesis_outline_${taskId}`,
              progress: '0',
              status: 'running'
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`));
          
          // 添加任务事件
          await addTaskEvent(userid, taskId, startEvent);

          // 调用Dify API
          console.log(`[${new Date().toISOString()}] 开始调用论文大纲Dify API - 任务ID: ${taskId}`);
          const difyStream = await callDifyThesisOutlineAPI(difyConfig, thesisOutlineRequest);
          
          // 处理Dify响应流
          const reader = difyStream.getReader();
          let buffer = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // 解码数据
              const chunk = new TextDecoder().decode(value);
              buffer += chunk;
              
              // 处理完整的事件
              const events = buffer.split('\n\n');
              buffer = events.pop() || ''; // 保留不完整的事件
              
              for (const event of events) {
                if (event.trim().startsWith('data:')) {
                  try {
                    const eventData = JSON.parse(event.replace('data:', '').trim());
                    
                    // 转发事件到客户端
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
                    
                    // 记录任务事件
                    await addTaskEvent(userid, taskId, eventData);
                    
                    // 如果工作流完成，更新任务状态
                    if (eventData.event === 'workflow_finished') {
                      await updateTaskStatus(userid, taskId, {
                        status: 'completed' as any,
                        progress: 100
                      });
                      
                      console.log(`[${new Date().toISOString()}] 论文大纲生成完成 - 任务ID: ${taskId}`);
                    }
                  } catch (parseError) {
                    console.error(`[${new Date().toISOString()}] 解析Dify事件失败:`, parseError);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] 论文大纲生成过程中出错:`, error);
          
          // 更新任务状态为失败
          await updateTaskStatus(userid, taskId, {
            status: 'failed' as any,
            progress: 0
          });
          
          // 发送错误事件
          const errorEvent = {
            event: 'error',
            task_id: taskId,
            data: {
              error: error instanceof Error ? error.message : '未知错误'
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          await addTaskEvent(userid, taskId, errorEvent);
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
    console.error(`[${new Date().toISOString()}] 论文大纲API处理请求时出错:`, error);
    
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 处理 OPTIONS 请求（CORS 预检）
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
