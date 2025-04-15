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

-- 禁用所有表的行级安全策略
-- user_service_quota表
ALTER TABLE public.user_service_quota DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon select quota" ON public.user_service_quota;
DROP POLICY IF EXISTS "Restrict delete" ON public.user_service_quota;
DROP POLICY IF EXISTS "Restrict update" ON public.user_service_quota;
DROP POLICY IF EXISTS "Restrict insert" ON public.user_service_quota;

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

-- 禁用行级安全策略
ALTER TABLE quota_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server-side log access" ON quota_logs;

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

-- 禁用行级安全策略
ALTER TABLE system_tokens DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server-side token access" ON system_tokens;

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

-- 禁用行级安全策略
ALTER TABLE token_usage_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server-side token logs" ON token_usage_logs;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_token_id ON token_usage_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON token_usage_logs(created_at);

-- 创建文章记录表
CREATE TABLE IF NOT EXISTS public.article_records (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    title TEXT,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    dify_task_id TEXT,
    style TEXT, -- 文章风格
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_article_records_user_id ON public.article_records (user_id);
CREATE INDEX IF NOT EXISTS idx_article_records_created_at ON public.article_records (created_at);

-- 禁用行级安全策略
ALTER TABLE public.article_records DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own articles" ON public.article_records;
DROP POLICY IF EXISTS "Users can delete own articles" ON public.article_records;
DROP POLICY IF EXISTS "Users can insert own articles" ON public.article_records; 
DROP POLICY IF EXISTS "Users can update own articles" ON public.article_records;
DROP POLICY IF EXISTS "Service role can access all articles" ON public.article_records;
DROP POLICY IF EXISTS "Allow anonymous insert articles" ON public.article_records;
DROP POLICY IF EXISTS "Allow anonymous view own articles" ON public.article_records;
DROP POLICY IF EXISTS "Allow any inserts to articles" ON public.article_records;

-- 存储桶权限设置
-- 注意：此SQL语句应在管理SQL编辑器中执行，并需要根据具体Supabase版本可能需要调整
-- 允许服务角色和匿名用户创建存储桶
BEGIN;
-- 如果存储桶策略已存在，先删除
DROP POLICY IF EXISTS "Allow anonymous storage bucket operations" ON storage.buckets;

-- 创建新的存储桶策略
CREATE POLICY "Allow anonymous storage bucket operations" ON storage.buckets
    FOR ALL USING (true);

-- 如果对象策略已存在，先删除
DROP POLICY IF EXISTS "Allow anonymous storage object operations" ON storage.objects;

-- 创建新的对象策略
CREATE POLICY "Allow anonymous storage object operations" ON storage.objects
    FOR ALL USING (true);
COMMIT; 