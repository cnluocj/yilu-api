import { supabase } from './supabase';

/**
 * 验证配额API密钥
 * @param apiKey API密钥
 * @returns 验证结果
 */
export async function validateQuotaApiKey(apiKey: string): Promise<{ valid: boolean; name?: string }> {
  try {
    console.log(`[${new Date().toISOString()}] 验证API密钥`);
    
    if (!apiKey) {
      console.log(`[${new Date().toISOString()}] API密钥为空`);
      return { valid: false };
    }
    
    // 检查环境变量中是否定义了系统API密钥
    const systemApiKey = process.env.QUOTA_API_KEY;
    if (systemApiKey && apiKey === systemApiKey) {
      console.log(`[${new Date().toISOString()}] 使用环境变量中的系统API密钥验证成功`);
      return { valid: true, name: 'system_env' };
    }
    
    // 检查数据库中的系统令牌
    const { data: token, error } = await supabase
      .from('system_tokens')
      .select('id, name')
      .eq('token', apiKey)
      .single();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] 查询系统令牌时出错:`, error);
      return { valid: false };
    }
    
    if (token) {
      console.log(`[${new Date().toISOString()}] 系统令牌验证成功: ${token.name}`);
      
      // 更新最后使用时间
      await supabase
        .from('system_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', token.id);
      
      // 记录使用情况
      await supabase
        .from('token_usage_logs')
        .insert({
          token_id: token.id,
          endpoint: 'articles',
          method: 'GET',
          status_code: 200
        });
      
      return { valid: true, name: token.name };
    }
    
    console.log(`[${new Date().toISOString()}] API密钥验证失败: 未找到有效的令牌`);
    return { valid: false };
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 验证API密钥时出错:`, err);
    return { valid: false };
  }
} 