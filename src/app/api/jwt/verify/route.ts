import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';

/**
 * JWT令牌验证接口
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体获取令牌
    const body = await request.json();
    const { token } = body;
    
    // 验证必要参数
    if (!token) {
      return NextResponse.json(
        { error: '缺少token参数' },
        { status: 400 }
      );
    }
    
    // 验证令牌
    const payload = verifyToken(token);
    
    // 返回验证结果
    if (payload) {
      return NextResponse.json(
        { valid: true, payload },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { valid: false, error: '令牌无效或已过期' },
        { status: 200 } // 返回200但指示令牌无效
      );
    }
  } catch (error) {
    console.error('验证JWT令牌失败:', error);
    return NextResponse.json(
      { valid: false, error: '验证令牌时发生错误' },
      { status: 500 }
    );
  }
}