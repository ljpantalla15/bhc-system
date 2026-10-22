import { AppError } from './errorHandler.js';

/**
 * Middleware that restricts route access to one or more allowed user roles.
 * Must be preceded by `requireAuth`.
 *
 * @param {...('BHW'|'MIDWIFE'|'ADMIN')} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'unauthenticated', 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'forbidden',
          `Access forbidden: user role '${req.user.role}' is not authorized for this resource.`
        )
      );
    }

    next();
  };
}
