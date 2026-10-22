import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  listUsersQuerySchema,
  userCreateSchema,
  userUpdateSchema,
} from '../schemas/users.js';

export const usersRouter = Router();

// All user administration endpoints are restricted to Administrator
usersRouter.use(requireAuth, requireRole('ADMIN'));

function formatUser(row, zoneIds) {
  const user = {
    id: parseInt(row.id, 10),
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    is_active: row.is_active,
    last_login_at: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };

  if (row.role === 'BHW') {
    user.zone_ids = zoneIds || [];
  }

  return user;
}

/**
 * GET /api/users
 * Lists user accounts with optional filtering by role and active status, paginated.
 * Passwords and password hashes are never returned.
 */
usersRouter.get('/', async (req, res, next) => {
  try {
    const qp = listUsersQuerySchema.parse(req.query);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (qp.role) {
      conditions.push(`role = $${idx++}`);
      params.push(qp.role);
    }

    if (qp.include_inactive === false) {
      conditions.push(`is_active = true`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countRes = await query(`SELECT count(*) FROM users ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Page items
    const offset = (qp.page - 1) * qp.page_size;
    const itemsRes = await query(
      `SELECT id, username, full_name, role, is_active, last_login_at, created_at, updated_at
         FROM users
        ${whereClause}
        ORDER BY id ASC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, qp.page_size, offset]
    );

    // Fetch zone assignments for any BHW accounts on this page
    const bhwUserIds = itemsRes.rows
      .filter((r) => r.role === 'BHW')
      .map((r) => r.id);

    const zonesByUser = {};
    if (bhwUserIds.length > 0) {
      const zoneRes = await query(
        `SELECT user_id, zone_id
           FROM user_zone_assignments
          WHERE user_id = ANY($1::bigint[])
          ORDER BY user_id, zone_id`,
        [bhwUserIds]
      );
      for (const row of zoneRes.rows) {
        if (!zonesByUser[row.user_id]) {
          zonesByUser[row.user_id] = [];
        }
        zonesByUser[row.user_id].push(parseInt(row.zone_id, 10));
      }
    }

    const items = itemsRes.rows.map((row) => formatUser(row, zonesByUser[row.id]));

    return res.status(200).json({
      items,
      page: qp.page,
      page_size: qp.page_size,
      total,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Creates a user account.
 * Hashes password with bcryptjs. `zone_ids` allowed only for BHW accounts.
 */
usersRouter.post('/', async (req, res, next) => {
  try {
    const body = userCreateSchema.parse(req.body);

    if (body.zone_ids && body.zone_ids.length > 0) {
      const zoneCheck = await query(
        'SELECT id FROM zones WHERE id = ANY($1::bigint[])',
        [body.zone_ids]
      );
      if (zoneCheck.rows.length !== body.zone_ids.length) {
        throw new AppError(400, 'validation_failed', 'One or more zone_ids do not exist.');
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const newUser = await withTransaction(req.user, async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, full_name, role, is_active, last_login_at, created_at, updated_at`,
        [body.username, passwordHash, body.full_name, body.role]
      );
      const createdUser = userRes.rows[0];

      if (body.role === 'BHW' && body.zone_ids && body.zone_ids.length > 0) {
        await client.query(
          `INSERT INTO user_zone_assignments (user_id, zone_id)
           SELECT $1, unnest($2::bigint[])`,
          [createdUser.id, body.zone_ids]
        );
      }

      return createdUser;
    });

    const userResponse = formatUser(newUser, body.zone_ids || []);
    res.setHeader('Location', `/api/users/${userResponse.id}`);
    return res.status(201).json(userResponse);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/users/:id
 * Updates or deactivates a user account.
 * Accounts are never deleted. Sending `zone_ids` replaces the zone list.
 * Deactivating a user revokes their open sessions.
 */
usersRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      throw new AppError(400, 'validation_failed', 'Invalid user ID.');
    }

    const body = userUpdateSchema.parse(req.body);

    // Check user exists
    const existingRes = await query(
      `SELECT id, username, full_name, role, is_active, last_login_at, created_at, updated_at
         FROM users
        WHERE id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      throw new AppError(404, 'not_found', 'User not found.');
    }

    const existingUser = existingRes.rows[0];
    const effectiveRole = body.role !== undefined ? body.role : existingUser.role;

    if (body.zone_ids !== undefined && body.zone_ids.length > 0 && effectiveRole !== 'BHW') {
      throw new AppError(400, 'validation_failed', 'zone_ids is allowed only for BHW accounts.');
    }

    if (body.zone_ids && body.zone_ids.length > 0) {
      const zoneCheck = await query(
        'SELECT id FROM zones WHERE id = ANY($1::bigint[])',
        [body.zone_ids]
      );
      if (zoneCheck.rows.length !== body.zone_ids.length) {
        throw new AppError(400, 'validation_failed', 'One or more zone_ids do not exist.');
      }
    }

    let passwordHash = undefined;
    if (body.password) {
      passwordHash = await bcrypt.hash(body.password, 10);
    }

    const updatedUser = await withTransaction(req.user, async (client) => {
      const updates = [];
      const values = [];
      let idx = 1;

      if (body.full_name !== undefined) {
        updates.push(`full_name = $${idx++}`);
        values.push(body.full_name);
      }

      if (passwordHash !== undefined) {
        updates.push(`password_hash = $${idx++}`);
        values.push(passwordHash);
      }

      if (body.role !== undefined) {
        updates.push(`role = $${idx++}`);
        values.push(body.role);
      }

      if (body.is_active !== undefined) {
        updates.push(`is_active = $${idx++}`);
        values.push(body.is_active);
      }

      let resUser;
      if (updates.length > 0) {
        updates.push('updated_at = now()');
        values.push(id);
        const updateRes = await client.query(
          `UPDATE users
              SET ${updates.join(', ')}
            WHERE id = $${idx}
        RETURNING id, username, full_name, role, is_active, last_login_at, created_at, updated_at`,
          values
        );
        resUser = updateRes.rows[0];
      } else {
        resUser = existingUser;
      }

      // Handle zone assignments
      if (body.zone_ids !== undefined) {
        await client.query('DELETE FROM user_zone_assignments WHERE user_id = $1', [id]);
        if (effectiveRole === 'BHW' && body.zone_ids.length > 0) {
          await client.query(
            `INSERT INTO user_zone_assignments (user_id, zone_id)
             SELECT $1, unnest($2::bigint[])`,
            [id, body.zone_ids]
          );
        }
      } else if (body.role !== undefined && body.role !== 'BHW' && existingUser.role === 'BHW') {
        // If changed from BHW to non-BHW and zone_ids wasn't passed, remove existing assignments
        await client.query('DELETE FROM user_zone_assignments WHERE user_id = $1', [id]);
      }

      // If user is deactivated, revoke all open sessions immediately
      if (body.is_active === false) {
        await client.query(
          'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
          [id]
        );
      }

      return resUser;
    });

    let finalZoneIds = [];
    if (effectiveRole === 'BHW') {
      const zoneRes = await query(
        'SELECT zone_id FROM user_zone_assignments WHERE user_id = $1 ORDER BY zone_id',
        [id]
      );
      finalZoneIds = zoneRes.rows.map((r) => parseInt(r.zone_id, 10));
    }

    return res.status(200).json(formatUser(updatedUser, finalZoneIds));
  } catch (err) {
    next(err);
  }
});
