import { ZodError } from 'zod';

/**
 * Validate req.body against a Zod schema.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.errors[0];
        const err2 = new Error(`Validation: ${first.path.join('.')} — ${first.message}`);
        err2.status = 400;
        err2.code = 'validation_error';
        return next(err2);
      }
      next(err);
    }
  };
}

/**
 * Validate req.query against a Zod schema.
 */
export function validateQuery(schema) {
  return (req, _res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.errors[0];
        const err2 = new Error(`Validation: ${first.path.join('.')} — ${first.message}`);
        err2.status = 400;
        err2.code = 'validation_error';
        return next(err2);
      }
      next(err);
    }
  };
}
