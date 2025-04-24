import { NextRequest, NextResponse } from 'next/server';
import { getUserArticles, deleteArticle } from '@/utils/article_storage';
import { validateQuotaApiKey } from '@/utils/apiAuth';
import { verifyToken } from '@/utils/jwt';

/**
 * GET /api/articles
 * 获取用户文章列表
 */
export async function GET(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到获取文章列表请求`);
    
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    // 获取API Key 或 JWT token
    const apiKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // 记录请求参数
    console.log(`[${new Date().toISOString()}][${requestId}] 请求参数: user_id=${userId}, limit=${limitParam}, offset=${offsetParam}`);
    
    // 检查必要参数
    if (!userId) {
      console.log(`[${new Date().toISOString()}][${requestId}] 验证失败: 缺少user_id参数`);
      return NextResponse.json(
        { error: '缺少user_id参数' },
        { status: 400 }
      );
    }
    
    // 验证授权
    let isAuthorized = false;
    
    // 先尝试验证API密钥
    if (apiKey) {
      const authResult = await validateQuotaApiKey(apiKey);
      isAuthorized = authResult.valid;
      
      if (isAuthorized) {
        console.log(`[${new Date().toISOString()}][${requestId}] API密钥验证成功: ${authResult.name}`);
      }
    }
    
    // 如果API密钥无效，尝试验证JWT
    if (!isAuthorized && token) {
      const payload = verifyToken(token);
      
      console.log(`[${new Date().toISOString()}][${requestId}] JWT令牌验证: payload=${JSON.stringify(payload)}`);
      if (payload && payload.permissions && 
          ((payload.permissions.includes('article:read') && payload.userId === userId) || 
           payload.role === 'admin' || 
           payload.role === 'system')) {
        isAuthorized = true;
        console.log(`[${new Date().toISOString()}][${requestId}] JWT令牌验证成功，用户: ${payload.userId}, 角色: ${payload.role}`);
      }
    }
    
    if (!isAuthorized) {
      console.log(`[${new Date().toISOString()}][${requestId}] 验证失败: 未提供有效的授权`);
      return NextResponse.json(
        { error: '未提供有效的授权' },
        { status: 401 }
      );
    }
    
    // 转换参数
    const limit = limitParam ? parseInt(limitParam, 10) : 0;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    
    // 获取文章列表
    const result = await getUserArticles(userId, limit, offset);
    
    // 返回结果 - Wrapped in standard ApiResponse structure
    console.log(`[${new Date().toISOString()}][${requestId}] 成功获取文章列表，共${result.total}篇文章`);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取文章列表出错:`, error);
    // Ensure error response also follows the standard format
    return NextResponse.json(
      { success: false, error: '获取文章列表时出错' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles
 * 删除指定文章
 */
export async function DELETE(request: NextRequest) {
  try {
    // 生成请求ID用于跟踪
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${new Date().toISOString()}][${requestId}] 收到删除文章请求`);
    
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const articleId = searchParams.get('article_id');
    
    // 获取API Key 或 JWT token
    const apiKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // 记录请求参数
    console.log(`[${new Date().toISOString()}][${requestId}] 请求参数: user_id=${userId}, article_id=${articleId}`);
    
    // 检查必要参数
    if (!userId || !articleId) {
      console.log(`[${new Date().toISOString()}][${requestId}] 验证失败: 缺少必要参数`);
      return NextResponse.json(
        { error: '缺少user_id或article_id参数' },
        { status: 400 }
      );
    }
    
    // 验证授权
    let isAuthorized = false;
    
    // 先尝试验证API密钥
    if (apiKey) {
      const authResult = await validateQuotaApiKey(apiKey);
      isAuthorized = authResult.valid;
      
      if (isAuthorized) {
        console.log(`[${new Date().toISOString()}][${requestId}] API密钥验证成功: ${authResult.name}`);
      }
    }
    
    // 如果API密钥无效，尝试验证JWT
    if (!isAuthorized && token) {
      const payload = verifyToken(token);
      
      if (payload && payload.permissions && 
          (payload.permissions.includes('article:delete') || 
           (payload.userId === userId && payload.permissions.includes('article:write')) || 
           payload.role === 'admin' || 
           payload.role === 'system')) {
        isAuthorized = true;
        console.log(`[${new Date().toISOString()}][${requestId}] JWT令牌验证成功，用户: ${payload.userId}, 角色: ${payload.role}`);
      }
    }
    
    if (!isAuthorized) {
      console.log(`[${new Date().toISOString()}][${requestId}] 验证失败: 未提供有效的授权`);
      return NextResponse.json(
        { error: '未提供有效的授权' },
        { status: 401 }
      );
    }
    
    // 删除文章
    const success = await deleteArticle(userId, articleId);
    
    // 返回结果
    console.log(`[${new Date().toISOString()}][${requestId}] 成功删除文章ID: ${articleId}`);
    return NextResponse.json({ success });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 删除文章出错:`, error);
    return NextResponse.json(
      { error: '删除文章时出错', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 