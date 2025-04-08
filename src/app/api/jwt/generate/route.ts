import { NextRequest, NextResponse } from 'next/server';
import { 
  generateToken, 
  verifyToken, 
  UserRole, 
  generateTokenWithCustomExpiry 
} from '@/utils/jwt';
import { ApiResponse } from '@/types';

/**
 * 生成JWT令牌
 * POST /api/jwt/generate
 * 请求体：{ userId: string, role: string, expiresIn?: string }
 * 响应：{ token: string, expiresAt: number } 或 { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `jwt-generate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到生成JWT令牌请求`);
    
    // 解析请求体
    const body = await request.json();
    const { userId, role, expiresIn } = body;
    
    // 验证必需参数
    if (!userId) {
      console.error(`[${new Date().toISOString()}][${requestId}] 缺少用户ID参数`);
      return NextResponse.json(
        { error: '缺少用户ID参数' },
        { status: 400 }
      );
    }
    
    // 验证角色是否有效
    if (!Object.values(UserRole).includes(role as UserRole)) {
      console.error(`[${new Date().toISOString()}][${requestId}] 无效的角色: ${role}`);
      return NextResponse.json(
        { error: `无效的角色。有效角色为: ${Object.values(UserRole).join(', ')}` },
        { status: 400 }
      );
    }
    
    // 基于角色设置适当的权限
    let permissions: string[] = [];
    switch (role) {
      case UserRole.ADMIN:
        permissions = ['quota:read', 'quota:write', 'quota:delete', 'user:manage'];
        break;
      case UserRole.SYSTEM:
        permissions = ['quota:read', 'quota:write'];
        break;
      case UserRole.CUSTOMER:
        permissions = ['quota:read'];
        break;
      default:
        permissions = [];
    }
    
    let token: string;
    let payload: any;
    
    // 使用自定义过期时间或默认过期时间
    if (expiresIn) {
      token = generateTokenWithCustomExpiry(
        { 
          userId, 
          role: role as UserRole,
          permissions // 添加权限到载荷
        },
        expiresIn
      );
      
      // 计算过期时间的UNIX时间戳
      payload = verifyToken(token);
    } else {
      token = generateToken({ 
        userId, 
        role: role as UserRole,
        permissions // 添加权限到载荷
      });
      payload = verifyToken(token);
    }
    
    console.log(`[${new Date().toISOString()}][${requestId}] JWT令牌生成成功，用户ID: ${userId}, 角色: ${role}, 权限: ${permissions.join(', ')}`);
    
    // 返回令牌和过期时间
    return NextResponse.json({
      token,
      expiresAt: payload?.exp || null
    });
  } catch (error) {
    console.error('生成JWT令牌时出错:', error);
    return NextResponse.json(
      { error: '生成令牌时发生错误' },
      { status: 500 }
    );
  }
} 