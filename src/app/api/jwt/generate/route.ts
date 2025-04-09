import { NextRequest, NextResponse } from 'next/server';
import { generateToken, UserRole } from '@/utils/jwt';

/**
 * JWT令牌生成接口
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, expiresIn, openId } = body;
    
    // 验证必要参数
    if (!userId) {
      return NextResponse.json(
        { error: '缺少userId参数' },
        { status: 400 }
      );
    }
    
    // 验证角色是否有效
    if (role && !Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: '无效的角色值' },
        { status: 400 }
      );
    }
    
    // 使用默认角色
    const userRole = role || UserRole.CUSTOMER;
    
    // 根据不同角色设置不同权限，实际项目中可能有更细粒度的权限控制
    let permissions: string[] = [];
    
    switch (userRole) {
      case UserRole.ADMIN:
        // 管理员拥有所有权限
        permissions = ['quota:read', 'quota:write', 'quota:delete', 'user:manage'];
        break;
      case UserRole.SYSTEM:
        // 系统服务拥有读写权限
        permissions = ['quota:read', 'quota:write'];
        break;
      case UserRole.CUSTOMER:
        // 普通用户只有读取权限
        permissions = ['quota:read'];
        break;
      default:
        // 其他角色没有权限
        permissions = [];
    }
    
    // 构建JWT载荷
    const payload = {
      userId,
      role: userRole,
      permissions,
      openId // 可选的OpenID，用于微信等身份标识
    };
    
    // 生成JWT令牌，使用自定义过期时间（如果提供）
    const token = expiresIn
      ? generateToken(payload, expiresIn)
      : generateToken(payload);
    
    // 计算过期时间戳（仅供参考）
    const now = Math.floor(Date.now() / 1000);
    const expiry = expiresIn ? parseExpiry(expiresIn) : 3600; // 默认1小时
    const expiresAt = now + expiry;
    
    return NextResponse.json(
      { token, expiresAt },
      { status: 200 }
    );
  } catch (error) {
    console.error('生成JWT令牌失败:', error);
    return NextResponse.json(
      { error: '生成令牌失败' },
      { status: 500 }
    );
  }
}

/**
 * 解析过期时间表达式（如'1h', '7d'）为秒数
 */
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhdy])$/i);
  if (!match) return 3600; // 默认1小时
  
  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);
  
  switch (unit.toLowerCase()) {
    case 's': return value;                  // 秒
    case 'm': return value * 60;             // 分钟
    case 'h': return value * 60 * 60;        // 小时
    case 'd': return value * 60 * 60 * 24;   // 天
    case 'y': return value * 60 * 60 * 24 * 365; // 年
    default: return 3600;                    // 默认1小时
  }
} 