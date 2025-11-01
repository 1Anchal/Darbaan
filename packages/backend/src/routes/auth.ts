import { auditAuthMiddleware } from '@/middleware/audit';
import { AuditEventType } from '@/services/auditService';
import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { apiRateLimit, authRateLimit } from '../middleware/rateLimiter';
import { authService } from '../services/authService';
import { loginSchema, refreshTokenSchema } from '../validation/schemas';

const router = express.Router();

// Login endpoint
router.post('/login', 
  authRateLimit.middleware(), 
  auditAuthMiddleware(AuditEventType.LOGIN_SUCCESS),
  asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  const result = await authService.login(value);
  
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(401).json(result);
  }
}));

// Refresh token endpoint
router.post('/refresh', 
  apiRateLimit.middleware(), 
  auditAuthMiddleware(AuditEventType.TOKEN_REFRESH),
  asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = refreshTokenSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  const result = await authService.refreshToken(value.refreshToken);
  
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(401).json(result);
  }
}));

// Logout endpoint
router.post('/logout', 
  authenticateToken, 
  auditAuthMiddleware(AuditEventType.LOGOUT),
  asyncHandler(async (req: Request, res: Response) => {
  // For now, logout is handled client-side by removing tokens
  // In production, you might want to implement token blacklisting
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  // The user info is already available from the token
  res.status(200).json({
    success: true,
    user: req.user
  });
}));

// Verify token endpoint
router.get('/verify', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
}));

export default router;