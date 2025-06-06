import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApiResponse } from '@/types';
import { verifyToken, UserRole, createSystemToken } from '@/utils/jwt';

// Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL || 'http://ai.jinzhibang.com.cn:8000';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTl9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

function isAdmin(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const payload = verifyToken(token);
    return payload?.role === UserRole.ADMIN;
  } catch {
    return false;
  }
}

// 接口验证
function validateAccess(request: NextRequest): { allowed: boolean; message: string } {
  // 检查管理员令牌
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!isAdmin(token)) {
    return { allowed: false, message: '需要管理员权限' };
  }
  
  return { allowed: true, message: '访问授权成功' };
}

interface SystemToken {
  id: string;
  name: string;
  token: string;
  created_at: string;
}

/**
 * 获取所有系统令牌列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证访问权限
    const access = validateAccess(request);
    if (!access.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: access.message },
        { status: 403 }
      );
    }
    
    // 从数据库获取系统令牌
    const { data } = await supabase
      .from('system_tokens')
      .select('*')
      .order('created_at', { ascending: false });
    
    return NextResponse.json<ApiResponse<SystemToken[]>>(
      { success: true, data: data || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('系统令牌API错误:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 创建新的系统令牌
 */
export async function POST(request: NextRequest) {
  try {
    // 验证访问权限
    const access = validateAccess(request);
    if (!access.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: access.message },
        { status: 403 }
      );
    }
    
    // 解析请求体
    const body = await request.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '缺少令牌名称' },
        { status: 400 }
      );
    }
    
    // 生成系统令牌
    const token = createSystemToken(name);
    
    // 保存令牌到数据库
    const { data, error } = await supabase
      .from('system_tokens')
      .insert([{ 
        name,
        token,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error('保存系统令牌失败:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `保存系统令牌失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json<ApiResponse<SystemToken>>(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建系统令牌错误:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 删除系统令牌
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证访问权限
    const access = validateAccess(request);
    if (!access.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: access.message },
        { status: 403 }
      );
    }
    
    // 获取令牌ID
    const url = new URL(request.url);
    const tokenId = url.searchParams.get('id');
    
    if (!tokenId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '缺少令牌ID' },
        { status: 400 }
      );
    }
    
    // 从数据库删除令牌
    const { error } = await supabase
      .from('system_tokens')
      .delete()
      .eq('id', tokenId);
    
    if (error) {
      console.error('删除系统令牌失败:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `删除系统令牌失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json<ApiResponse<{ id: string }>>(
      { success: true, data: { id: tokenId } },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除系统令牌错误:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 