import { NextRequest, NextResponse } from 'next/server';
import { ServiceType } from '@/types';
import { getUserTaskStatus, getNewTaskEvents } from '@/utils/task-manager';

// 任务状态查询API
export async function GET(request: NextRequest) {
  try {
    // 获取URL参数
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('task_id');
    const userId = searchParams.get('user_id');
    const lastEventIndex = searchParams.get('last_event_index');
    const includeHistory = searchParams.get('include_history') === 'true';
    
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到任务状态请求: ${request.url}`);

    // 验证必要参数
    if (!taskId || !userId) {
      console.log(`[${new Date().toISOString()}][${requestId}] 缺少必要参数`);
      return NextResponse.json(
        { error: '缺少必要参数: task_id 或 user_id' },
        { status: 400 }
      );
    }

    // 如果请求的是增量事件
    if (lastEventIndex !== null) {
      console.log(`[${new Date().toISOString()}][${requestId}] 增量事件请求，索引: ${lastEventIndex}`);
      const fromIndex = parseInt(lastEventIndex) || 0;
      
      // 获取指定索引后的新事件
      const newEventsResult = await getNewTaskEvents(userId, taskId, fromIndex);
      
      if (!newEventsResult) {
        console.log(`[${new Date().toISOString()}][${requestId}] 任务不存在`);
        return NextResponse.json(
          { error: '任务不存在或已过期' },
          { status: 404 }
        );
      }
      
      console.log(`[${new Date().toISOString()}][${requestId}] 返回${newEventsResult.events.length}个新事件，lastIndex=${newEventsResult.lastIndex}`);
      return NextResponse.json(newEventsResult);
    }
    
    // 获取任务状态
    const taskStatus = await getUserTaskStatus(userId, taskId);
    
    if (!taskStatus) {
      console.log(`[${new Date().toISOString()}][${requestId}] 任务不存在`);
      return NextResponse.json(
        { error: '任务不存在或已过期' },
        { status: 404 }
      );
    }

    // 根据includeHistory参数决定是否包含完整历史记录
    if (!includeHistory) {
      // 不包含完整历史记录，只返回必要信息
      const { eventHistory, ...taskWithoutHistory } = taskStatus;
      console.log(`[${new Date().toISOString()}][${requestId}] 返回基本任务状态，事件数量: ${eventHistory.length}`);
      return NextResponse.json({
        ...taskWithoutHistory,
        eventCount: eventHistory.length,
      });
    }
    
    // 返回完整任务状态，包括事件历史
    console.log(`[${new Date().toISOString()}][${requestId}] 返回完整任务状态，包含${taskStatus.eventHistory.length}个事件`);
    return NextResponse.json(taskStatus);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 查询任务状态时出错:`, error);
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    );
  }
}