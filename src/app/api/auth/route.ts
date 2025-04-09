import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { 
  createAdminToken, 
  createCustomerToken, 
  createSystemToken, 
  UserRole 
} from '@/utils/jwt';

// 简单的用户数据库（实际项目中应使用真实数据库）
const users = [
  {
    username: 'admin',
    password: 'admin123',
    role: UserRole.ADMIN,
    userId: 'admin-user',
    permissions: ['quota:read', 'quota:write', 'user:read', 'user:write']
  },
  {
    username: 'customer1',
    password: 'customer123',
    role: UserRole.CUSTOMER,
    userId: 'customer-1',
    permissions: ['quota:read']
  },
  {
    username: 'system',
    password: 'system123',
    role: UserRole.SYSTEM,
    userId: 'system-service',
    permissions: ['quota:read', 'quota:write']
  }
];

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    userId: string;
    username: string;
    role: UserRole;
    permissions: string[];
  }
}

/**
 * 用户登录接口
 */
export async function POST(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `auth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到登录请求`);
    
    // 解析请求体
    const body = await request.json() as LoginRequest;
    
    // 验证请求数据
    if (!body.username || !body.password) {
      console.error(`[${new Date().toISOString()}][${requestId}] 缺少用户名或密码`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '缺少用户名或密码' },
        { status: 400 }
      );
    }
    
    // 查找用户
    const user = users.find(u => 
      u.username === body.username && 
      u.password === body.password
    );
    
    if (!user) {
      console.error(`[${new Date().toISOString()}][${requestId}] 用户名或密码错误`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    
    // 根据用户角色生成不同的令牌
    let token = '';
    
    switch (user.role) {
      case UserRole.ADMIN:
        token = createAdminToken(user.userId);
        break;
      case UserRole.CUSTOMER:
        token = createCustomerToken(user.userId);
        break;
      case UserRole.SYSTEM:
        token = createSystemToken(user.userId);
        break;
      default:
        token = createCustomerToken(user.userId);
    }
    
    console.log(`[${new Date().toISOString()}][${requestId}] 用户 ${user.username} 登录成功`);
    
    // 返回响应
    return NextResponse.json<ApiResponse<LoginResponse>>(
      { 
        success: true, 
        data: {
          token,
          user: {
            userId: user.userId,
            username: user.username,
            role: user.role,
            permissions: user.permissions
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 登录API出错:`, error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : '内部服务器错误' },
      { status: 500 }
    );
  }
} 