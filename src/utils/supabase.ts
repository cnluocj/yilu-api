import { createClient } from '@supabase/supabase-js';

// 本地 Supabase 实例配置
const supabaseUrl = process.env.SUPABASE_URL || 'http://ai.jinzhibang.com.cn:8000';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTl9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// 打印连接参数到日志
console.log(`[${new Date().toISOString()}] Supabase连接配置:`);
console.log(`[${new Date().toISOString()}] - URL: ${supabaseUrl}`);
console.log(`[${new Date().toISOString()}] - 密钥: ${supabaseKey}`);
console.log(`[${new Date().toISOString()}] - 环境变量存在: SUPABASE_URL=${!!process.env.SUPABASE_URL}, SUPABASE_ANON_KEY=${!!process.env.SUPABASE_ANON_KEY}`);

// 注意: 在实际生产环境中，不应该硬编码这些值，而是使用环境变量
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 检查是否能够连接到Supabase
 * @returns 是否连接成功
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log(`[${new Date().toISOString()}] 检查 Supabase 连接状态...`);
    
    const { error } = await supabase.from('user_service_quota').select('count').limit(1);
    
    if (error) {
      console.error(`[${new Date().toISOString()}] Supabase 连接检查失败:`, error);
      return false;
    }
    
    console.log(`[${new Date().toISOString()}] Supabase 连接正常`);
    return true;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 检查 Supabase 连接时出错:`, err);
    return false;
  }
} 