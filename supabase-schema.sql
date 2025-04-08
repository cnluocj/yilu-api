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