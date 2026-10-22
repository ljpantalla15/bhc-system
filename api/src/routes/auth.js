import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { loginRequestSchema } from '../schemas/auth.js';

export const authRouter = Router();

// Rate limiting on login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Too many login attempts. Please try again later.',
      },
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * POST /api/auth/login
 * Public endpoint. Checks credentials, creates a server-side session, and returns a JWT.
 */
authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginRequestSchema.parse(req.body);

    const userRes = await query(
      `SELECT id, username, password_hash, full_name, role, is_active,
              last_login_at, created_at, updated_at
         FROM users
        WHERE username = $1`,
      [username]
    );

    if (userRes.rows.length === 0) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password.');
    }

    const user = userRes.rows[0];

    // Deactivated users cannot log in (same 401 response per conventions)
    if (!user.is_active) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password.');
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password.');
    }

    // Create session in auth_sessions
    const expiresAt = new Date(Date.now() + config.sessionHours * 3600 * 1000);
    const sessionRes = await query(
      `INSERT INTO auth_sessions (user_id, expires_at)
       VALUES ($1, $2)
       RETURNING id, issued_at, expires_at`,
      [user.id, expiresAt]
    );
    const session = sessionRes.rows[0];

    // Stamp last_login_at
    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    // Retrieve zone assignments for BHW accounts
    let zoneIds = undefined;
    if (user.role === 'BHW') {
      const zoneRes = await query(
        'SELECT zone_id FROM user_zone_assignments WHERE user_id = $1 ORDER BY zone_id',
        [user.id]
      );
      zoneIds = zoneRes.rows.map((r) => parseInt(r.zone_id, 10));
    }

    // Sign JWT with jti = sessionId, sub = user.id
    const token = jwt.sign(
      {
        sub: String(user.id),
        jti: session.id,
        role: user.role,
        username: user.username,
      },
      config.jwtSecret,
      { expiresIn: `${config.sessionHours}h` }
    );

    const userResponse = {
      id: parseInt(user.id, 10),
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      ...(user.role === 'BHW' ? { zone_ids: zoneIds } : {}),
      last_login_at: user.last_login_at ? new Date(user.last_login_at).toISOString() : null,
      created_at: new Date(user.created_at).toISOString(),
      updated_at: new Date(user.updated_at).toISOString(),
    };

    return res.status(200).json({
      token,
      token_type: 'Bearer',
      expires_at: expiresAt.toISOString(),
      user: userResponse,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Protected endpoint. Revokes the session so the token stops working.
 */
authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await query(
      'UPDATE auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
      [req.sessionId]
    );

    return res.status(200).json({
      message: 'Session ended.',
    });
  } catch (err) {
    next(err);
  }
});
