import { ZodError } from 'zod';

/**
 * Custom error class for API errors with standard status code and error code.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Maps known PostgreSQL constraint names to appropriate error responses.
 */
const CONSTRAINT_MAP = {
  residents_no_exact_duplicate_uq: {
    status: 400,
    code: 'duplicate_resident',
    message: 'A resident with the same name and birth date already exists.',
  },
  residents_one_head_per_household_uq: {
    status: 400,
    code: 'validation_failed',
    message: 'A household can only have one active head.',
  },
  residents_philhealth_id_uq: {
    status: 400,
    code: 'validation_failed',
    message: 'PhilHealth ID is already assigned to another active resident.',
  },
  users_username_uq: {
    status: 400,
    code: 'validation_failed',
    message: 'Username is already taken.',
  },
  households_no_uq: {
    status: 400,
    code: 'validation_failed',
    message: 'Household number already exists.',
  },
};

/**
 * Express centralized error handling middleware.
 */
export function errorHandler(err, req, res, _next) {
  // 1. Zod validation error
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    return res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Validation failed.',
        details,
      },
    });
  }

  // 2. Custom application error (AppError)
  if (err instanceof AppError) {
    const response = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) {
      response.error.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // 3. PostgreSQL constraint errors (mapped by err.constraint)
  if (err.constraint && CONSTRAINT_MAP[err.constraint]) {
    const mapped = CONSTRAINT_MAP[err.constraint];
    return res.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
      },
    });
  }

  // 4. PostgreSQL error codes:
  // 23514 (check_violation), 23503 (foreign_key_violation), 22023 (invalid_parameter_value)
  if (['23514', '23503', '22023'].includes(err.code)) {
    return res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Database validation constraint violated.',
      },
    });
  }

  // 5. JSON body parse error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Malformed JSON payload.',
      },
    });
  }

  // 6. Unknown / Internal Server Error (500)
  // Per Rule 5: Never return raw database error text. Log server-side.
  console.error('[Internal Server Error]', err);
  return res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Something went wrong.',
    },
  });
}
