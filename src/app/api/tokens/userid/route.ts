import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { createCustomerToken } from '@/utils/jwt';

/**
 * 获取UserID令牌
 * 可通过此接口，使用UserID获取访问令牌
 */
export async function GET(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `userid-token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到UserID令牌请求`);
    
    // 从查询参数中获取UserID
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userid'); // Changed from openid
    
    // 检查UserID是否提供
    if (!userId) {
      console.error(`[${new Date().toISOString()}][${requestId}] 未提供UserID`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '未提供UserID' },
        { status: 400 }
      );
    }
    
    // 获取IP地址作为额外安全措施 (Optional, but good practice)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    console.log(`[${new Date().toISOString()}][${requestId}] 请求IP: ${ip}, UserID: ${userId}`);
    
    // 直接使用userId创建令牌
    // Assuming createCustomerToken can handle generic userId or if specific logic is needed, it should be adapted here
    const token = createCustomerToken(userId); // Simplified: directly use userId
    
    // 返回令牌
    return NextResponse.json<ApiResponse<{ token: string }>>(
      { 
        success: true, 
        data: { token } 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] UserID令牌API错误:`, error);
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '服务器内部错误' 
      },
      { status: 500 }
    );
  }
} 