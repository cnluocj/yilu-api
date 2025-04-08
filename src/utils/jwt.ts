// 导入jsonwebtoken库，使用require避开TypeScript类型问题
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

// JWT 密钥，实际应用中应从环境变量获取
// 在生产环境中绝对不要硬编码这个值，应通过环境变量设置
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-for-yilu-api-quota-management';

// 令牌有效期，默认1小时
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '1h';

// 定义用户角色
export enum UserRole {
  ADMIN = 'admin',      // 管理员角色
  CUSTOMER = 'customer', // 客户角色
  SYSTEM = 'system'     // 系统服务角色
}

// JWT 载荷接口
export interface JwtPayload {
  userId: string;        // 用户ID
  role: UserRole;        // 用户角色
  permissions?: string[]; // 可选权限列表
  iat?: number;          // 令牌签发时间
  exp?: number;          // 令牌过期时间
  name?: string;         // 可选名称字段，用于标识令牌用途
  openId?: string;       // 可选OpenID字段，用于微信等用户识别
}

/**
 * 生成 JWT 令牌
 * @param payload JWT载荷数据
 * @returns JWT令牌字符串
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  try {
    // 使用require导入的jwt没有TypeScript类型检查问题
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    
    console.log(`[${new Date().toISOString()}] 生成JWT令牌成功，用户ID: ${payload.userId}, 角色: ${payload.role}`);
    return token;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 生成JWT令牌失败:`, error);
    throw new Error('无法生成授权令牌');
  }
}

/**
 * 生成自定义过期时间的JWT令牌
 * @param payload JWT载荷数据
 * @param expiresIn 过期时间表达式，如'1h', '7d', '365d'等，传入null表示永不过期
 * @returns JWT令牌字符串
 */
export function generateTokenWithCustomExpiry(
  payload: Omit<JwtPayload, 'iat' | 'exp'>, 
  expiresIn: string | null
): string {
  try {
    // 配置选项，如果expiresIn为null则不设置过期时间
    const options = expiresIn ? { expiresIn } : {};
    
    // 生成令牌
    const token = jwt.sign(payload, JWT_SECRET, options);
    
    console.log(`[${new Date().toISOString()}] 生成自定义有效期JWT令牌成功，用户ID: ${payload.userId}, 角色: ${payload.role}, 有效期: ${expiresIn || '永久'}`);
    return token;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 生成自定义有效期JWT令牌失败:`, error);
    throw new Error('无法生成授权令牌');
  }
}

/**
 * 验证 JWT 令牌
 * @param token JWT令牌字符串
 * @returns 解码后的载荷数据，如果验证失败则返回null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    console.log(`[${new Date().toISOString()}] JWT令牌验证成功，用户ID: ${decoded.userId}, 角色: ${decoded.role}`);
    return decoded;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] JWT令牌验证失败:`, error);
    return null;
  }
}

/**
 * 刷新 JWT 令牌
 * @param token 现有的JWT令牌
 * @returns 新的JWT令牌，如果原令牌无效则返回null
 */
export function refreshToken(token: string): string | null {
  const payload = verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  // 创建新的载荷，去除原来的iat和exp字段
  const { iat, exp, ...restPayload } = payload;
  
  // 生成新令牌
  return generateToken(restPayload);
}

/**
 * 生成系统服务令牌
 * 用于系统内部服务间通信，通常具有更高权限
 * @returns 系统服务JWT令牌
 */
export function generateSystemToken(): string {
  const systemId = `system-${Date.now()}`;
  
  return generateToken({
    userId: systemId,
    role: UserRole.SYSTEM,
    permissions: ['quota:read', 'quota:write']
  });
}

/**
 * 生成永久有效的系统服务令牌
 * 用于支付服务等需要长期访问权限的系统服务
 * @param name 令牌名称或用途，用于识别
 * @returns 永久有效的系统服务JWT令牌
 */
export function generatePermanentSystemToken(name: string): string {
  const systemId = `system-${name}-${Date.now()}`;
  
  return generateTokenWithCustomExpiry({
    userId: systemId,
    name: name, // 添加名称字段便于识别
    role: UserRole.SYSTEM,
    permissions: ['quota:read', 'quota:write']
  }, null); // 传null表示永不过期
}

/**
 * 管理员令牌
 * @param adminId 管理员ID
 * @returns 管理员JWT令牌
 */
export function generateAdminToken(adminId: string): string {
  return generateToken({
    userId: adminId,
    role: UserRole.ADMIN,
    permissions: ['quota:read', 'quota:write', 'quota:delete', 'user:manage']
  });
}

/**
 * 生成客户令牌
 * @param customerId 客户ID
 * @returns 客户JWT令牌
 */
export function generateCustomerToken(customerId: string): string {
  return generateToken({
    userId: customerId,
    role: UserRole.CUSTOMER,
    permissions: ['quota:read']
  });
}

/**
 * 基于OpenID生成客户令牌
 * 用于小程序等场景，只需传入OpenID即可生成令牌
 * @param openId 用户的OpenID
 * @param expiresIn 过期时间，默认为1小时
 * @returns 客户JWT令牌
 */
export function generateOpenIdToken(openId: string, expiresIn: string = '1h'): string {
  const customerId = `wx-${openId}`;
  
  return generateTokenWithCustomExpiry({
    userId: customerId,
    openId: openId, // 存储原始OpenID
    role: UserRole.CUSTOMER,
    permissions: ['quota:read']
  }, expiresIn);
} 