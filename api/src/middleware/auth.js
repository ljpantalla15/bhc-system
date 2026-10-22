import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { AppError } from './errorHandler.js';

/**
 * Authentication middleware that verifies JWT and checks the auth_sessions table.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'unauthenticated', 'Missing or invalid authorization header.');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError(401, 'unauthenticated', 'Authorization token missing.');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new AppError(401, 'unauthenticated', 'Token is expired or invalid.');
    }

    const sessionId = payload.jti;
    if (!sessionId) {
      throw new AppError(401, 'unauthenticated', 'Invalid token session claim.');
    }

    // Verify session row exists, is not revoked, and is not expired
    const sessionRes = await query(
      `SELECT s.id AS session_id, s.revoked_at, s.expires_at,
              u.id AS user_id, u.username, u.full_name, u.role, u.is_active
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      throw new AppError(401, 'unauthenticated', 'Session not found.');
    }

    const row = sessionRes.rows[0];

    if (row.revoked_at != null) {
      throw new AppError(401, 'unauthenticated', 'Session has been revoked.');
    }

    if (new Date(row.expires_at) <= new Date()) {
      throw new AppError(401, 'unauthenticated', 'Session has expired.');
    }

    if (!row.is_active) {
      throw new AppError(401, 'unauthenticated', 'User account is deactivated.');
    }

    // Load zone assignments for BHW users
    let zoneIds = undefined;
    if (row.role === 'BHW') {
      const zoneRes = await query(
        'SELECT zone_id FROM user_zone_assignments WHERE user_id = $1 ORDER BY zone_id',
        [row.user_id]
      );
      zoneIds = zoneRes.rows.map((r) => parseInt(r.zone_id, 10));
    }

    req.user = {
      id: parseInt(row.user_id, 10),
      username: row.username,
      full_name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      zone_ids: zoneIds,
    };
    req.sessionId = row.session_id;

    next();
  } catch (err) {
    next(err);
  }
}
