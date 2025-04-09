/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
// 使用require导入以避免TypeScript类型问题
const jwt = require('jsonwebtoken');

// JWT密钥 - 生产环境应从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-for-yilu-api-quota-management';

// JWT过期时间 - 默认1小时
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',     // 管理员
  SYSTEM = 'system',   // 系统服务
  CUSTOMER = 'customer' // 普通用户
}

// JWT载荷接口
export interface JwtPayload {
  userId: string;
  openId?: string;     // 微信OpenID
  role: UserRole;
  permissions?: string[]; // 权限列表
}

/**
 * 生成JWT令牌
 * @param payload 令牌载荷
 * @param expiresIn 过期时间
 * @returns JWT令牌
 */
export function generateToken(payload: JwtPayload, expiresIn: string = JWT_EXPIRY): string {
  try {
    // 确保payload包含了必要的字段
    if (!payload.userId || !payload.role) {
      throw new Error('生成JWT令牌需要指定userId和role');
    }
    
    // 自动根据角色设置权限
    if (!payload.permissions) {
      payload.permissions = getDefaultPermissions(payload.role);
    }
    
    // 生成JWT
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
    console.log(`[${new Date().toISOString()}] 成功为用户 ${payload.userId} 生成JWT令牌，角色: ${payload.role}`);
    
    return token;
  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] 生成JWT令牌出错:`, error);
    throw error;
  }
}

/**
 * 验证JWT令牌
 * @param token JWT令牌
 * @returns 如果验证成功返回解码后的载荷，否则返回null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`[${new Date().toISOString()}] JWT令牌验证成功，用户ID: ${decoded.userId}`);
    return decoded as JwtPayload;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      console.error(`[${new Date().toISOString()}] JWT令牌已过期`);
    } else {
      console.error(`[${new Date().toISOString()}] JWT令牌验证失败:`, error);
    }
    return null;
  }
}

/**
 * 刷新JWT令牌
 * @param token 旧的JWT令牌
 * @param expiresIn 新令牌的过期时间
 * @returns 新的JWT令牌，如果旧令牌无效则返回null
 */
export function refreshToken(token: string, expiresIn: string = JWT_EXPIRY): string | null {
  try {
    // 验证旧令牌
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // 移除旧的时间戳
    const { userId, role, permissions, openId } = decoded;
    
    // 生成新令牌
    return generateToken({ userId, role, permissions, openId }, expiresIn);
  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] 刷新JWT令牌失败:`, error);
    return null;
  }
}

/**
 * 获取角色的默认权限
 * @param role 用户角色
 * @returns 权限列表
 */
function getDefaultPermissions(role: UserRole): string[] {
  switch (role) {
    case UserRole.ADMIN:
      return ['quota:read', 'quota:write', 'quota:delete', 'user:manage'];
    case UserRole.SYSTEM:
      return ['quota:read', 'quota:write'];
    case UserRole.CUSTOMER:
      return ['quota:read'];
    default:
      return [];
  }
}

/**
 * 创建系统服务令牌
 * @param serviceId 服务ID
 * @returns JWT令牌
 */
export function createSystemToken(serviceId: string): string {
  return generateToken({
    userId: `system-${serviceId}`,
    role: UserRole.SYSTEM,
    permissions: ['quota:read', 'quota:write']
  }, '30d'); // 系统令牌有效期较长
}

/**
 * 创建管理员令牌
 * @param adminId 管理员ID
 * @returns JWT令牌
 */
export function createAdminToken(adminId: string): string {
  return generateToken({
    userId: adminId,
    role: UserRole.ADMIN
  }, '12h'); // 管理员令牌有效期12小时
}

/**
 * 创建用户令牌
 * @param userId 用户ID
 * @param openId 微信OpenID (可选)
 * @returns JWT令牌
 */
export function createCustomerToken(userId: string, openId?: string): string {
  return generateToken({
    userId,
    openId,
    role: UserRole.CUSTOMER
  }, '24h'); // 用户令牌有效期24小时
} 