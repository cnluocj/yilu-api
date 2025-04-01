import { NextRequest, NextResponse } from 'next/server';
import { GenerateTitlesRequest, WorkflowEvent } from '@/types';
import { callDifyWorkflowAPI, getDifyConfig } from '@/utils/dify';

// 用于在开发环境中使用的模拟数据
const mockResponseData: WorkflowEvent[] = [
  {
    event: "workflow_started",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "3d3925fb-af9b-4873-ba01-391524d18bbc",
      progress: "0",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "3d3925fb-af9b-4873-ba01-391524d18bbc",
      progress: "30",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "3d3925fb-af9b-4873-ba01-391524d18bbc",
      progress: "60",
      status: "running"
    }
  },
  {
    event: "workflow_running",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "3d3925fb-af9b-4873-ba01-391524d18bbc",
      progress: "90",
      status: "running"
    }
  },
  {
    event: "workflow_finished",
    task_id: "8e7d5b30-af21-49c6-b843-276f58d19e4a",
    workflow_run_id: "42c9b8f5-1e67-4d92-a8c3-5fd731b06e28",
    data: {
      workflow_id: "3d3925fb-af9b-4873-ba01-391524d18bbc",
      progress: "100",
      result: [
        "高血压防治：日常生活中的饮食调理与血压监测",
        "认识糖尿病：早期症状识别与血糖管理要点",
        "儿童健康成长：疫苗接种时间表与常见问题解答",
        "脊柱健康守护：颈椎病的预防与家庭康复指南",
        "心脑血管疾病预警：风险因素与预防措施详解"
      ],
      elapsed_time: "4.8",
      status: "succeeded"
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: GenerateTitlesRequest = await request.json();
    
    // 验证请求数据（基本验证）
    if (!body.openid || !body.direction) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      );
    }

    // 获取是否使用模拟数据的环境变量（在开发环境中可用于调试）
    const useMockData = process.env.USE_MOCK_DATA === 'true';
    
    // 设置流响应
    const encoder = new TextEncoder();
    let stream: ReadableStream<Uint8Array>;
    
    if (useMockData) {
      // 使用模拟数据进行响应
      stream = new ReadableStream({
        async start(controller) {
          // 发送每个模拟数据项，添加延迟以模拟实时更新
          for (const item of mockResponseData) {
            const data = `data: ${JSON.stringify(item)}\n\n`;
            controller.enqueue(encoder.encode(data));
            
            // 添加延迟以模拟服务器处理时间
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          controller.close();
        }
      });
    } else {
      // 使用实际的Dify API
      const config = getDifyConfig();
      
      // 检查API密钥是否已配置
      if (!config.apiKey) {
        return NextResponse.json(
          { error: 'Dify API密钥未配置，请在环境变量中设置DIFY_API_KEY' },
          { status: 500 }
        );
      }
      
      // 调用Dify API并获取流响应
      stream = await callDifyWorkflowAPI(config, body);
    }

    // 返回流响应
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('生成标题API中出错:', error);
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    );
  }
} 