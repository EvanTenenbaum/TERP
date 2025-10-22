import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/csrf-token
 * Returns a CSRF token for the authenticated user
 * This token must be included in all state-changing requests (POST, PUT, DELETE)
 */
export async function GET(req: NextRequest) {
  // Get user ID from headers (set by middleware after JWT verification)
  const userId = req.headers.get('x-user-id');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  const csrfToken = generateCsrfToken(userId);
  
  return NextResponse.json({ csrfToken });
}
