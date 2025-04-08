import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { ApiResponse } from '@/types';

/**
 * 验证JWT令牌
 * POST /api/jwt/verify
 * 请求体：{ token: string }
 * 响应：{ valid: boolean, payload?: object } 或 { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `jwt-verify-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到验证JWT令牌请求`);
    
    // 解析请求体
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      console.error(`[${new Date().toISOString()}][${requestId}] 缺少令牌参数`);
      return NextResponse.json(
        { error: '缺少令牌参数' },
        { status: 400 }
      );
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      console.error(`[${new Date().toISOString()}][${requestId}] 令牌无效或已过期`);
      return NextResponse.json({ 
        valid: false, 
        error: '令牌无效或已过期' 
      });
    }
    
    console.log(`[${new Date().toISOString()}][${requestId}] JWT令牌验证成功，用户ID: ${payload.userId}, 角色: ${payload.role}`);
    
    return NextResponse.json({
      valid: true,
      payload
    });
  } catch (error) {
    console.error('验证JWT令牌时出错:', error);
    return NextResponse.json(
      { error: '验证令牌时发生错误' },
      { status: 500 }
    );
  }
}