import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UserServiceQuota, AddQuotaRequest, ServiceType } from '@/types';
import { addUserQuota, getUserQuota } from '@/utils/quota';
import { checkSupabaseConnection } from '@/utils/supabase';
import { verifyToken, UserRole } from '@/utils/jwt';

/**
 * 验证授权令牌并检查权限
 * @param request 请求对象
 * @param requiredPermission 所需权限
 * @returns 验证状态和错误信息
 */
function validateAuth(request: NextRequest, requiredPermission: string): { 
  isAuthorized: boolean; 
  userId?: string;
  openId?: string;
  role?: UserRole;
  error?: string 
} {
  try {
    // 从请求头中获取授权令牌
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAuthorized: false, error: '缺少授权令牌' };
    }
    
    // 提取令牌
    const token = authHeader.substring(7);
    
    // 验证令牌
    const payload = verifyToken(token);
    
    if (!payload) {
      return { isAuthorized: false, error: '无效的授权令牌' };
    }
    
    // 检查是否为管理员或系统角色（这些角色具有所有权限）
    if (payload.role === UserRole.ADMIN || payload.role === UserRole.SYSTEM) {
      return { 
        isAuthorized: true, 
        userId: payload.userId,
        openId: payload.openId,
        role: payload.role 
      };
    }
    
    // 检查特定权限
    const hasPermission = payload.permissions?.includes(requiredPermission);
    
    if (!hasPermission) {
      return { isAuthorized: false, error: '权限不足' };
    }
    
    return { 
      isAuthorized: true, 
      userId: payload.userId,
      openId: payload.openId,
      role: payload.role 
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 验证授权时出错:`, error);
    return { isAuthorized: false, error: '授权验证失败' };
  }
}

/**
 * 获取用户服务配额
 */
export async function GET(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `quota-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到查询服务配额请求`);
    
    // 验证授权（读取配额信息需要 quota:read 权限）
    const auth = validateAuth(request, 'quota:read');
    
    if (!auth.isAuthorized) {
      console.error(`[${new Date().toISOString()}][${requestId}] 授权失败: ${auth.error}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }
    
    // 检查 Supabase 连接
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      console.error(`[${new Date().toISOString()}][${requestId}] 无法连接到 Supabase 数据库`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '无法连接到数据库' },
        { status: 500 }
      );
    }
    
    // 从查询参数中获取用户ID和服务类型
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const serviceId = searchParams.get('service_id') as ServiceType;
    
    // 验证请求参数
    if (!userId || !serviceId) {
      console.error(`[${new Date().toISOString()}][${requestId}] 缺少必要参数: user_id 或 service_id`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '缺少必要参数: user_id 或 service_id' },
        { status: 400 }
      );
    }
    
    // 验证服务类型是否有效
    if (!Object.values(ServiceType).includes(serviceId)) {
      console.error(`[${new Date().toISOString()}][${requestId}] 无效的服务类型: ${serviceId}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `无效的服务类型: ${serviceId}` },
        { status: 400 }
      );
    }
    
    // 权限检查: 普通用户(CUSTOMER)只能查询自己的配额
    if (auth.role === UserRole.CUSTOMER) {
      // 如果是使用OpenID生成的令牌，验证用户只能查询自己的配额
      if (auth.openId && userId !== `wx-${auth.openId}`) {
        console.error(`[${new Date().toISOString()}][${requestId}] 权限错误: 用户只能查询自己的配额, tokenUserId: ${auth.userId}, requestedUserId: ${userId}`);
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: '权限不足: 只能查询自己的配额信息' },
          { status: 403 }
        );
      }
      
      // 如果是常规用户令牌，同样验证
      if (!auth.openId && userId !== auth.userId) {
        console.error(`[${new Date().toISOString()}][${requestId}] 权限错误: 用户只能查询自己的配额, tokenUserId: ${auth.userId}, requestedUserId: ${userId}`);
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: '权限不足: 只能查询自己的配额信息' },
          { status: 403 }
        );
      }
    }
    
    // 查询用户配额
    const quota = await getUserQuota(userId, serviceId);
    console.log(`[${new Date().toISOString()}][${requestId}] 用户配额查询结果:`, quota);
    
    // 返回响应
    return NextResponse.json<ApiResponse<UserServiceQuota | null>>(
      { success: true, data: quota },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 查询服务配额API出错:`, error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : '内部服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 添加用户服务配额
 */
export async function POST(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `quota-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到添加服务配额请求`);
    
    // 验证授权（修改配额需要 quota:write 权限）
    const auth = validateAuth(request, 'quota:write');
    
    if (!auth.isAuthorized) {
      console.error(`[${new Date().toISOString()}][${requestId}] 授权失败: ${auth.error}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }
    
    // 检查 Supabase 连接
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      console.error(`[${new Date().toISOString()}][${requestId}] 无法连接到 Supabase 数据库`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '无法连接到数据库' },
        { status: 500 }
      );
    }
    
    // 解析请求体
    const body = await request.json() as AddQuotaRequest;
    console.log(`[${new Date().toISOString()}][${requestId}] 请求参数:`, body);
    
    // 验证请求数据
    if (!body.user_id || !body.service_id || typeof body.amount !== 'number') {
      console.error(`[${new Date().toISOString()}][${requestId}] 缺少必要字段或格式错误`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '缺少必要字段或格式错误' },
        { status: 400 }
      );
    }
    
    // 权限检查: 普通用户(CUSTOMER)只能为自己添加配额
    if (auth.role === UserRole.CUSTOMER) {
      // 如果是使用OpenID生成的令牌，验证用户只能为自己添加配额
      if (auth.openId && body.user_id !== `wx-${auth.openId}`) {
        console.error(`[${new Date().toISOString()}][${requestId}] 权限错误: 用户只能为自己添加配额, tokenUserId: ${auth.userId}, requestedUserId: ${body.user_id}`);
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: '权限不足: 只能为自己添加配额' },
          { status: 403 }
        );
      }
      
      // 如果是常规用户令牌，同样验证
      if (!auth.openId && body.user_id !== auth.userId) {
        console.error(`[${new Date().toISOString()}][${requestId}] 权限错误: 用户只能为自己添加配额, tokenUserId: ${auth.userId}, requestedUserId: ${body.user_id}`);
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: '权限不足: 只能为自己添加配额' },
          { status: 403 }
        );
      }
    }
    
    // 验证服务类型是否有效
    if (!Object.values(ServiceType).includes(body.service_id)) {
      console.error(`[${new Date().toISOString()}][${requestId}] 无效的服务类型: ${body.service_id}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `无效的服务类型: ${body.service_id}` },
        { status: 400 }
      );
    }
    
    // 验证配额数量是否为正数
    if (body.amount <= 0) {
      console.error(`[${new Date().toISOString()}][${requestId}] 配额数量必须为正数`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '配额数量必须为正数' },
        { status: 400 }
      );
    }
    
    // 添加用户配额
    const updatedQuota = await addUserQuota(body.user_id, body.service_id, body.amount);
    console.log(`[${new Date().toISOString()}][${requestId}] 配额添加成功, 当前剩余: ${updatedQuota.remaining_quota}`);
    
    // 记录请求操作者
    console.log(`[${new Date().toISOString()}][${requestId}] 操作由用户 ${auth.userId} 执行`);
    
    // 返回响应
    return NextResponse.json<ApiResponse<UserServiceQuota>>(
      { success: true, data: updatedQuota },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 添加服务配额API出错:`, error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : '内部服务器错误' },
      { status: 500 }
    );
  }
} 