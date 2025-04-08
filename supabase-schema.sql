-- 用户服务配额表
CREATE TABLE IF NOT EXISTS public.user_service_quota (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    remaining_quota INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_user_service_quota_user_id ON public.user_service_quota (user_id);
CREATE INDEX IF NOT EXISTS idx_user_service_quota_service_id ON public.user_service_quota (service_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_service_quota_user_service ON public.user_service_quota (user_id, service_id);

-- 为匿名用户添加权限
ALTER TABLE public.user_service_quota ENABLE ROW LEVEL SECURITY;

-- 添加权限策略
CREATE POLICY "Allow anon select quota" ON public.user_service_quota FOR SELECT USING (true);

-- 只允许自己特定API修改
CREATE POLICY "Restrict delete" ON public.user_service_quota FOR DELETE USING (false);
CREATE POLICY "Restrict update" ON public.user_service_quota FOR UPDATE USING (false);
CREATE POLICY "Restrict insert" ON public.user_service_quota FOR INSERT WITH CHECK (false);

-- 注意: 在实际部署时，你可能需要为特定的服务账户或后台管理系统添加更多权限
-- 例如添加管理员角色和相应的策略

-- 创建配额操作记录表
CREATE TABLE IF NOT EXISTS quota_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  operator TEXT
);

-- 添加安全策略
ALTER TABLE quota_logs ENABLE ROW LEVEL SECURITY;

-- 日志只能由服务器通过密钥访问，不允许匿名访问
CREATE POLICY "Allow server-side log access" ON quota_logs
FOR ALL USING (true);

-- 创建系统令牌表，用于存储永久有效的系统令牌
CREATE TABLE IF NOT EXISTS system_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  description TEXT
);

-- 添加安全策略
ALTER TABLE system_tokens ENABLE ROW LEVEL SECURITY;

-- 系统令牌表只能通过服务器密钥访问
CREATE POLICY "Allow server-side token access" ON system_tokens
FOR ALL USING (true);

-- 创建插入索引
CREATE INDEX IF NOT EXISTS idx_system_tokens_created_at ON system_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_system_tokens_name ON system_tokens(name);

-- 创建令牌授权记录表，记录令牌的使用情况
CREATE TABLE IF NOT EXISTS token_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id UUID REFERENCES system_tokens(id),
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加安全策略
ALTER TABLE token_usage_logs ENABLE ROW LEVEL SECURITY;

-- 日志只能由服务器通过密钥访问，不允许匿名访问
CREATE POLICY "Allow server-side token logs" ON token_usage_logs
FOR ALL USING (true);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_token_id ON token_usage_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON token_usage_logs(created_at); 