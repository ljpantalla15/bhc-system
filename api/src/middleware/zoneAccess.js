import { AppError } from './errorHandler.js';

/**
 * Middleware that verifies the authenticated user has access to a requested zone.
 * Midwives have access to all zones.
 * BHWs are restricted to their assigned zones (returns 403 if unassigned).
 * Administrators have no access to zone data (returns 403).
 *
 * @param {(req: import('express').Request) => number | string | null | undefined} getZoneId
 */
export function requireZoneAccess(getZoneId) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'unauthenticated', 'Authentication required.');
      }

      if (user.role === 'ADMIN') {
        throw new AppError(403, 'forbidden', 'Administrators have no access to resident zone data.');
      }

      const rawZoneId = getZoneId(req);
      if (rawZoneId == null) {
        return next();
      }

      const zoneId = parseInt(rawZoneId, 10);
      if (isNaN(zoneId)) {
        throw new AppError(400, 'validation_failed', 'Invalid zone ID.');
      }

      if (user.role === 'MIDWIFE') {
        return next(); // Midwife has read access to all zones
      }

      if (user.role === 'BHW') {
        const assignedZones = user.zone_ids || [];
        if (!assignedZones.includes(zoneId)) {
          throw new AppError(403, 'forbidden', 'You do not have access to this zone.');
        }
        return next();
      }

      throw new AppError(403, 'forbidden', 'Unauthorized role for zone access.');
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates whether a user can view or modify a record located in a specific zone.
 * Returns 404 if a BHW attempts to access a record in a zone they are not assigned to,
 * concealing the record's existence per CONVENTIONS.md.
 *
 * @param {object} user - req.user object
 * @param {number} recordZoneId - zone ID of the requested record
 * @param {string} [recordType='Record'] - Entity name for error message
 */
export function assertRecordZoneAccess(user, recordZoneId, recordType = 'Record') {
  if (!user) {
    throw new AppError(401, 'unauthenticated', 'Authentication required.');
  }

  if (user.role === 'ADMIN') {
    throw new AppError(403, 'forbidden', 'Administrators have no access to resident data.');
  }

  if (user.role === 'MIDWIFE') {
    return true; // Midwife has read access across all zones
  }

  if (user.role === 'BHW') {
    const assignedZones = user.zone_ids || [];
    if (!assignedZones.includes(parseInt(recordZoneId, 10))) {
      // 404: existence of the record outside their zone is concealed
      throw new AppError(404, 'not_found', `${recordType} not found.`);
    }
    return true;
  }

  throw new AppError(403, 'forbidden', 'Forbidden.');
}

/**
 * Resolves the zone filter array for search queries or masterlist generation.
 *
 * @param {object} user - req.user object
 * @param {number|null} [requestedZoneId=null] - Optional specific zone requested by query param
 * @returns {number[] | null} Array of allowed zone IDs, or null for all zones (Midwife)
 */
export function getEffectiveZoneFilter(user, requestedZoneId = null) {
  if (user.role === 'ADMIN') {
    throw new AppError(403, 'forbidden', 'Administrators have no access to resident health data.');
  }

  if (requestedZoneId != null) {
    const zoneId = parseInt(requestedZoneId, 10);
    if (user.role === 'BHW') {
      const assignedZones = user.zone_ids || [];
      if (!assignedZones.includes(zoneId)) {
        throw new AppError(403, 'forbidden', 'You do not have access to this zone.');
      }
    }
    return [zoneId];
  }

  if (user.role === 'MIDWIFE') {
    return null; // All zones
  }

  if (user.role === 'BHW') {
    return user.zone_ids || [];
  }

  return [];
}
