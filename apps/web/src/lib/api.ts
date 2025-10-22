import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { getCurrentUserId, getCurrentRole, requireRole, UserRole } from './auth';
import { ERPError } from './errors';

type ApiHandler<T> = (input: T, req: NextRequest) => Promise<any>;

export function api<T>(
  schema: ZodSchema<T>,
  handler: ApiHandler<T>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest) => {
    try {
      // Enforce RBAC
      if (allowedRoles && allowedRoles.length > 0) {
        requireRole(allowedRoles);
      }

      // Parse and validate input
      let input: T;
      const method = req.method;

      if (method === 'GET' || method === 'DELETE') {
        const url = new URL(req.url);
        const params: Record<string, any> = Object.fromEntries(url.searchParams.entries());
        // Convert numeric strings to numbers
        Object.keys(params).forEach(key => {
          const val = params[key];
          if (val && !isNaN(Number(val))) {
            params[key] = Number(val);
          }
        });
        input = schema.parse(params);
      } else {
        const body = await req.json();
        input = schema.parse(body);
      }

      // Execute handler
      const result = await handler(input, req);

      // Return success response
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      // Handle errors
      if (error instanceof ERPError) {
        return NextResponse.json(error.toJSON(), { status: error.statusCode });
      }

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Unhandled API error:', error);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  };
}
