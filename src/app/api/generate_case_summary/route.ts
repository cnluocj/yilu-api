import { NextRequest, NextResponse } from 'next/server';
import { getCaseSummaryDifyConfig, callDifyCaseSummaryAPI } from '@/utils/dify';
import { ServiceType } from '@/types';
import { createTask, updateTaskStatus, addTaskEvent } from '@/utils/task-manager';

export async function POST(request: NextRequest) {
  console.log(`[${new Date().toISOString()}] 接收到病案总结生成请求`);

  try {
    const contentType = request.headers.get('content-type') || '';
    let userid: string, name: string, unit: string, files: any[];

    if (contentType.includes('application/json')) {
      // JSON格式请求（小程序Base64方式）
      console.log(`[${new Date().toISOString()}] 处理JSON格式请求（Base64图片）`);
      const body = await request.json();
      userid = body.userid;
      name = body.name;
      unit = body.unit;

      // 将Base64图片转换为File对象
      files = [];
      if (body.images && Array.isArray(body.images)) {
        for (let i = 0; i < body.images.length; i++) {
          const imageData = body.images[i];
          if (imageData.data && imageData.name) {
            try {
              // 解析Base64数据
              const base64Data = imageData.data.replace(/^data:image\/[a-z]+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');

              // 创建File-like对象 - Node.js兼容版本
              // 使用any类型避免复杂的类型检查问题
              const file: any = {
                name: imageData.name,
                type: imageData.type || 'image/jpeg',
                size: buffer.length,
                lastModified: Date.now(),
                webkitRelativePath: '',
                arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
                bytes: async () => new Uint8Array(buffer),
                stream: () => new ReadableStream({
                  start(controller) {
                    controller.enqueue(buffer);
                    controller.close();
                  }
                }),
                text: async () => buffer.toString(),
                slice: (start?: number, end?: number) => buffer.slice(start, end)
              };

              files.push(file);
              console.log(`[${new Date().toISOString()}] 转换Base64图片: ${imageData.name}, 大小: ${buffer.length} bytes`);
            } catch (error) {
              console.error(`[${new Date().toISOString()}] Base64图片转换失败:`, error);
            }
          }
        }
      }
    } else {
      // FormData格式请求（原有方式）
      console.log(`[${new Date().toISOString()}] 处理FormData格式请求`);
      const formData = await request.formData();

      // 获取基本参数
      userid = formData.get('userid') as string;
      name = formData.get('name') as string;
      unit = formData.get('unit') as string;

      // 获取文件
      files = [];
      const fileEntries = formData.getAll('files');

      for (const entry of fileEntries) {
        // 在Node.js环境中，FormData的文件条目可能不是File实例
        // 检查是否有文件的基本属性
        if (entry && typeof entry === 'object' && 'name' in entry && 'type' in entry) {
          files.push(entry as any);
        }
      }
    }
    
    // 验证必需参数
    if (!userid || !name || !unit) {
      console.log(`[${new Date().toISOString()}] 缺少必需参数`);
      return NextResponse.json(
        { error: '缺少必需参数: userid, name, unit' },
        { status: 400 }
      );
    }
    
    if (files.length === 0) {
      console.log(`[${new Date().toISOString()}] 未上传文件`);
      return NextResponse.json(
        { error: '请至少上传一个图片文件' },
        { status: 400 }
      );
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        console.log(`[${new Date().toISOString()}] 不支持的文件类型: ${file.type}`);
        return NextResponse.json(
          { error: `不支持的文件类型: ${file.type}。请上传图片文件。` },
          { status: 400 }
        );
      }
    }
    
    console.log(`[${new Date().toISOString()}] 病案总结请求参数 - 用户: ${userid}, 医生: ${name}, 科室: ${unit}, 文件数量: ${files.length}`);
    
    // 病案总结功能目前处于测试阶段，跳过配额检查
    console.log(`[${new Date().toISOString()}] 病案总结测试阶段 - 跳过配额检查 - 用户: ${userid}`);
    
    // 创建任务
    const task = await createTask(userid, ServiceType.ALL);
    const taskId = task.id;

    console.log(`[${new Date().toISOString()}] 创建病案总结任务 - 任务ID: ${taskId}`);
    
    // 准备请求对象
    const caseSummaryRequest = {
      userid,
      name,
      unit,
      files
    };
    
    // 获取Dify配置
    const difyConfig = getCaseSummaryDifyConfig();
    
    // 创建SSE响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 测试阶段不消费配额
        
        try {
          // 调用Dify API
          const difyStream = await callDifyCaseSummaryAPI(difyConfig, caseSummaryRequest);
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
                      statusTitle: '开始分析病案'
                    });
                  } else if (eventData.event === 'workflow_running') {
                    const progress = parseInt(eventData.data?.progress || '0');
                    await updateTaskStatus(userid, taskId, {
                      status: 'running' as any,
                      progress,
                      statusTitle: eventData.data?.title || '分析病案图片中'
                    });
                  } else if (eventData.event === 'workflow_finished') {
                    const success = eventData.data?.status !== 'failed';

                    if (success) {
                      // 测试阶段不消费配额
                      console.log(`[${new Date().toISOString()}] 病案总结成功（测试阶段，不消费配额） - 用户: ${userid}`);

                      await updateTaskStatus(userid, taskId, {
                        status: 'completed' as any,
                        progress: 100,
                        statusTitle: '病案总结完成'
                      });
                    } else {
                      await updateTaskStatus(userid, taskId, {
                        status: 'failed' as any,
                        progress: 100,
                        statusTitle: '病案总结失败'
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
          console.error(`[${new Date().toISOString()}] 病案总结生成过程中出错:`, error);
          
          // 更新任务状态为失败
          await updateTaskStatus(userid, taskId, {
            status: 'failed' as any,
            progress: 100,
            statusTitle: '病案总结失败'
          });
          
          // 发送错误事件
          const errorEvent = {
            event: "workflow_finished",
            task_id: taskId,
            data: {
              progress: "100",
              result: [`病案总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`],
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
    console.error(`[${new Date().toISOString()}] 病案总结API处理请求时出错:`, error);
    
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
