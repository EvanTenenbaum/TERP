export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'INTERNAL_ERROR';

export class ERPError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: string;
  public readonly statusCode: number;

  constructor(code: ErrorCode, details?: string) {
    super(code);
    this.name = 'ERPError';
    this.code = code;
    this.details = details;
    this.statusCode = this.getStatusCode(code);
    Error.captureStackTrace(this, this.constructor);
  }

  private getStatusCode(code: ErrorCode): number {
    const map: Record<ErrorCode, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      UNPROCESSABLE: 422,
      INTERNAL_ERROR: 500,
    };
    return map[code] || 500;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.details || this.code,
    };
  }
}
