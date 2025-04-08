import express, { Request, Response } from 'express';
import { 
  generateToken, 
  verifyToken, 
  UserRole, 
  generateTokenWithCustomExpiry 
} from '../utils/jwt';

const router = express.Router();

/**
 * 生成JWT令牌
 * POST /api/jwt/generate
 * 请求体：{ userId: string, role: string, expiresIn?: string }
 * 响应：{ token: string, expiresAt: number } 或 { error: string }
 */
router.post('/generate', (req: Request, res: Response) => {
  try {
    const { userId, role, expiresIn } = req.body;
    
    // 验证必需参数
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID参数' });
    }
    
    // 验证角色是否有效
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({ 
        error: `无效的角色。有效角色为: ${Object.values(UserRole).join(', ')}` 
      });
    }
    
    let token: string;
    let payload: any;
    
    // 使用自定义过期时间或默认过期时间
    if (expiresIn) {
      token = generateTokenWithCustomExpiry(
        { userId, role: role as UserRole },
        expiresIn
      );
      
      // 计算过期时间的UNIX时间戳
      payload = verifyToken(token);
    } else {
      token = generateToken({ userId, role: role as UserRole });
      payload = verifyToken(token);
    }
    
    // 返回令牌和过期时间
    return res.json({
      token,
      expiresAt: payload?.exp || null
    });
  } catch (error) {
    console.error('生成JWT令牌时出错:', error);
    return res.status(500).json({ error: '生成令牌时发生错误' });
  }
});

/**
 * 验证JWT令牌
 * POST /api/jwt/verify
 * 请求体：{ token: string }
 * 响应：{ valid: boolean, payload?: object } 或 { error: string }
 */
router.post('/verify', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: '缺少令牌参数' });
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.json({ 
        valid: false, 
        error: '令牌无效或已过期' 
      });
    }
    
    return res.json({
      valid: true,
      payload
    });
  } catch (error) {
    console.error('验证JWT令牌时出错:', error);
    return res.status(500).json({ error: '验证令牌时发生错误' });
  }
});

export default router; 