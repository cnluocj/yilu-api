import { NextRequest, NextResponse } from 'next/server';
import { GenerateTitlesRequest, WorkflowEvent } from '@/types';

// Sample mock data based on provided example
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
    // Parse request body
    const body: GenerateTitlesRequest = await request.json();
    
    // Validate request data (basic validation)
    if (!body.openid || !body.direction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Set up the stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send each mock data item with a delay to simulate real-time updates
        for (const item of mockResponseData) {
          const data = `data: ${JSON.stringify(item)}\n\n`;
          controller.enqueue(encoder.encode(data));
          
          // Add a delay between each response to simulate server processing
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        controller.close();
      }
    });

    // Return the stream response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error in generate_titles API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 