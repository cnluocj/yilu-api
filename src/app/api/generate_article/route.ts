import { NextRequest, NextResponse } from 'next/server';
import { GenerateArticleRequest, WorkflowEvent, ServiceType } from '@/types';
import { callDifyGenerateArticleAPI, getArticleDifyConfig } from '@/utils/dify';
import { getUserQuota, consumeQuota } from '@/utils/quota'; // 引入配额管理功能，更新函数名

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
    if (!body.direction || !body.openid) {
      console.log(`[${new Date().toISOString()}][${requestId}] 验证失败: 缺少必要字段`);
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }
    
    // 获取是否使用模拟数据的环境变量（在开发环境中可用于调试）
    const useMockData = process.env.USE_MOCK_DATA === 'true';
    const skipQuotaCheck = process.env.SKIP_QUOTA_CHECK === 'true'; // 对于测试环境，可配置跳过配额检查

    // 保存配额信息，用于后续处理
    let quota = null;
    
    // 检查用户配额是否足够（跳过模拟数据模式）
    if (!useMockData && !skipQuotaCheck) {
      try {
        // 检查用户是否有足够的配额
        console.log(`[${new Date().toISOString()}][${requestId}] 检查用户(${body.openid})的文章生成服务配额`);
        quota = await getUserQuota(body.openid, ServiceType.KP);
        
        if (!quota || quota.remaining_quota <= 0) {
          console.error(`[${new Date().toISOString()}][${requestId}] 用户(${body.openid})的文章生成服务配额不足`);
          return NextResponse.json(
            { error: '服务配额不足，请联系管理员添加配额' },
            { status: 403 }
          );
        }
        
        console.log(`[${new Date().toISOString()}][${requestId}] 用户(${body.openid})的文章生成服务配额充足，剩余: ${quota.remaining_quota}`);
      } catch (quotaError) {
        console.error(`[${new Date().toISOString()}][${requestId}] 检查配额时出错:`, quotaError);
        return NextResponse.json(
          { error: '检查服务配额时出错' },
          { status: 500 }
        );
      }
    }

    console.log(`[${new Date().toISOString()}][${requestId}] 使用模拟数据: ${useMockData}`);
    
    // 设置流响应
    const encoder = new TextEncoder();
    let stream: ReadableStream<Uint8Array>;
    
    if (useMockData) {
      // 使用模拟数据进行响应
      console.log(`[${new Date().toISOString()}][${requestId}] 使用模拟数据响应`);
      stream = new ReadableStream({
        async start(controller) {
          // 发送每个模拟数据项，添加延迟以模拟实时更新
          for (const item of mockResponseData) {
            const data = `data: ${JSON.stringify(item)}\n\n`;
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
      console.log(`[${new Date().toISOString()}][${requestId}] 准备调用生成文章Dify API`);
      const config = getArticleDifyConfig();
      
      // 检查API密钥是否已配置
      if (!config.apiKey) {
        console.log(`[${new Date().toISOString()}][${requestId}] 错误: 生成文章Dify API密钥未配置`);
        return NextResponse.json(
          { error: '生成文章Dify API密钥未配置，请在环境变量中设置ARTICLE_DIFY_API_KEY' },
          { status: 500 }
        );
      }
      
      // 不再在这里先消耗配额，而是等待文件生成结果后再决定是否扣除配额
      
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
            
            // 如果有数据，先写入输出流
            writer.write(value);
            
            // 同时解析数据以检测文件数量
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            // 检查是否包含workflow_finished事件
            if (buffer.includes('"event":"workflow_finished"') || buffer.includes('"event": "workflow_finished"')) {
              isWorkflowFinished = true;
              
              // 尝试提取文件数量
              try {
                // 分割成事件并找到workflow_finished
                const events = buffer.split('\n\n');
                for (const event of events) {
                  if (event.startsWith('data: ') && (event.includes('"event":"workflow_finished"') || event.includes('"event": "workflow_finished"'))) {
                    const eventData = JSON.parse(event.substring(6));
                    if (eventData.data && eventData.data.files && Array.isArray(eventData.data.files)) {
                      fileCount = eventData.data.files.length;
                      console.log(`[${new Date().toISOString()}][${requestId}] 检测到工作流完成事件，文件数量: ${fileCount}`);
                      
                      // 当文件数量 > 1 且配额检查未被跳过时，扣除配额
                      if (fileCount > 0 && !skipQuotaCheck && quota) {
                        try {
                          console.log(`[${new Date().toISOString()}][${requestId}] 生成成功，文件数量: ${fileCount}，消耗用户(${body.openid})的一次文章生成服务配额`);
                          const remainingQuota = await consumeQuota(body.openid, ServiceType.KP, `system-article-${requestId}`);
                          console.log(`[${new Date().toISOString()}][${requestId}] 配额消耗成功，剩余: ${remainingQuota}`);
                        } catch (quotaError) {
                          console.error(`[${new Date().toISOString()}][${requestId}] 消耗配额时出错:`, quotaError);
                          // 继续处理，不中断流
                        }
                      } else {
                        console.log(`[${new Date().toISOString()}][${requestId}] 不消耗配额，原因: ${skipQuotaCheck ? '跳过配额检查' : fileCount > 0 ? '' : '无文件生成'}`);
                      }
                      break; // 找到后退出循环
                    }
                  }
                }
              } catch (e) {
                console.error(`[${new Date().toISOString()}][${requestId}] 解析完成事件数据失败:`, e);
              }
            }
          }
          
          // 最后再检查一次，以防漏检
          if (!isWorkflowFinished) {
            console.log(`[${new Date().toISOString()}][${requestId}] 流结束但未检测到工作流完成事件，不消耗配额`);
          }
          
          // 关闭输出流
          writer.close();
        } catch (error) {
          console.error(`[${new Date().toISOString()}][${requestId}] 处理响应流时出错:`, error);
          writer.abort(error);
        }
      })();
      
      // 使用经过处理的流
      stream = readable;
    }

    // 在响应返回前记录日志
    console.log(`[${new Date().toISOString()}][${requestId}] 返回生成文章流响应`);
    
    // 返回流响应
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId // 添加请求ID便于跟踪
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