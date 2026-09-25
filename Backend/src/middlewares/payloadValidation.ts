import { Request, Response, NextFunction} from 'express';
import { ZodType, ZodError } from 'zod';


export const validateRequest = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
          code: issue.code
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
