import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { createCustomerToken } from '@/utils/jwt';

/**
 * 获取OpenID令牌
 * 小程序端可以通过此接口，仅使用OpenID获取访问令牌
 */
export async function GET(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `openid-token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到OpenID令牌请求`);
    
    // 从查询参数中获取OpenID
    const { searchParams } = new URL(request.url);
    const openId = searchParams.get('openid');
    
    // 检查OpenID是否提供
    if (!openId) {
      console.error(`[${new Date().toISOString()}][${requestId}] 未提供OpenID`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '未提供OpenID' },
        { status: 400 }
      );
    }
    
    // 验证OpenID格式（简单验证，可根据实际情况调整）
    if (!/^[\w-]{5,}$/.test(openId)) {
      console.error(`[${new Date().toISOString()}][${requestId}] OpenID格式无效: ${openId}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'OpenID格式无效' },
        { status: 400 }
      );
    }
    
    // 获取IP地址作为额外安全措施
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    console.log(`[${new Date().toISOString()}][${requestId}] 请求IP: ${ip}, OpenID: ${openId}`);
    
    // 为微信用户创建令牌，使用wx-前缀的userId
    const userId = `wx-${openId}`;
    const token = createCustomerToken(userId, openId);
    
    // 返回令牌
    return NextResponse.json<ApiResponse<{ token: string }>>(
      { 
        success: true, 
        data: { token } 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] OpenID令牌API错误:`, error);
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '服务器内部错误' 
      },
      { status: 500 }
    );
  }
} 