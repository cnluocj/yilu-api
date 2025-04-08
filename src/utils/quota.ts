import { supabase } from './supabase';
import { UserServiceQuota, ServiceType } from '@/types';

/**
 * 获取用户的服务配额
 * @param userId 用户ID
 * @param serviceId 服务类型
 * @returns 用户的服务配额信息，如果不存在则返回null
 */
export async function getUserQuota(userId: string, serviceId: ServiceType): Promise<UserServiceQuota | null> {
  try {
    console.log(`[${new Date().toISOString()}] 查询用户(${userId})的${serviceId}服务配额`);
    
    const { data, error } = await supabase
      .from('user_service_quota')
      .select('*')
      .eq('user_id', userId)
      .eq('service_id', serviceId)
      .single();
    
    if (error) {
      // 如果错误是因为找不到数据，返回null
      if (error.code === 'PGRST116') {
        console.log(`[${new Date().toISOString()}] 用户(${userId})的${serviceId}服务配额不存在`);
        return null;
      }
      
      console.error(`[${new Date().toISOString()}] 查询服务配额出错:`, error);
      throw new Error(`查询服务配额失败: ${error.message}`);
    }
    
    return data as UserServiceQuota;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 获取用户配额时出错:`, err);
    throw err;
  }
}

/**
 * 添加用户服务配额
 * @param userId 用户ID
 * @param serviceId 服务类型
 * @param amount 添加的配额数量
 * @returns 更新后的用户服务配额
 */
export async function addUserQuota(userId: string, serviceId: ServiceType, amount: number): Promise<UserServiceQuota> {
  try {
    console.log(`[${new Date().toISOString()}] 为用户(${userId})添加${amount}次${serviceId}服务配额`);
    
    // 首先查询用户是否已有配额记录
    const existingQuota = await getUserQuota(userId, serviceId);
    
    if (existingQuota) {
      // 如果存在，则更新配额
      const { data, error } = await supabase
        .from('user_service_quota')
        .update({
          remaining_quota: existingQuota.remaining_quota + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingQuota.id)
        .select()
        .single();
      
      if (error) {
        console.error(`[${new Date().toISOString()}] 更新服务配额出错:`, error);
        throw new Error(`更新服务配额失败: ${error.message}`);
      }
      
      console.log(`[${new Date().toISOString()}] 成功更新用户(${userId})的${serviceId}服务配额，现有配额: ${data.remaining_quota}`);
      return data as UserServiceQuota;
    } else {
      // 如果不存在，则创建新记录
      const { data, error } = await supabase
        .from('user_service_quota')
        .insert({
          user_id: userId,
          service_id: serviceId,
          remaining_quota: amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error(`[${new Date().toISOString()}] 创建服务配额出错:`, error);
        throw new Error(`创建服务配额失败: ${error.message}`);
      }
      
      console.log(`[${new Date().toISOString()}] 成功创建用户(${userId})的${serviceId}服务配额，初始配额: ${amount}`);
      return data as UserServiceQuota;
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 添加用户配额时出错:`, err);
    throw err;
  }
}

/**
 * 使用一次服务配额
 * @param userId 用户ID
 * @param serviceId 服务类型
 * @returns 更新后的剩余配额，如果配额不足则抛出错误
 */
export async function useQuota(userId: string, serviceId: ServiceType): Promise<number> {
  try {
    console.log(`[${new Date().toISOString()}] 用户(${userId})使用一次${serviceId}服务`);
    
    // 查询当前配额
    const quota = await getUserQuota(userId, serviceId);
    
    // 如果配额不存在或配额不足
    if (!quota || quota.remaining_quota <= 0) {
      const errorMsg = `用户(${userId})的${serviceId}服务配额不足`;
      console.error(`[${new Date().toISOString()}] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // 更新配额
    const { data, error } = await supabase
      .from('user_service_quota')
      .update({
        remaining_quota: quota.remaining_quota - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', quota.id)
      .select()
      .single();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] 使用服务配额时出错:`, error);
      throw new Error(`使用服务配额失败: ${error.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] 用户(${userId})成功使用一次${serviceId}服务，剩余配额: ${data.remaining_quota}`);
    return data.remaining_quota;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 使用配额时出错:`, err);
    throw err;
  }
} 