import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'

export type ApiOptions = {
  roles?: string[]
  rate?: { key: string; limit: number; windowMs?: number }
  postingLock?: boolean
  parseJson?: boolean
  onError?: (e: any) => { code: string; status: number } | undefined
}

type HandlerCtx<T = any> = {
  req: Request
  params?: Record<string, string>
  json?: T
}

export function api<TBody = any>(opts: ApiOptions) {
  return function <R = any>(handler: (ctx: HandlerCtx<TBody>) => Promise<Response> | Response) {
    return async (req: Request, context?: { params?: Record<string, string> }) => {
      try {
        const method = (req.method || 'GET').toUpperCase()
        const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
        if (opts.roles && opts.roles.length) {
          try { requireRole(opts.roles as any) } catch { return err('forbidden', 403) }
        }
        // Enforce posting lock by default for mutating endpoints unless explicitly disabled
        if (opts.postingLock || (isMutating && opts.postingLock !== false)) {
          try { await ensurePostingUnlocked(opts.roles as any) } catch { return err('posting_locked', 423) }
        }
        // Apply rate limiting: explicit config wins, else default for mutating endpoints
        if (opts.rate || isMutating) {
          const rateCfg = opts.rate ?? { key: new URL(req.url).pathname.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, ''), limit: 60 }
          const windowMs = rateCfg.windowMs ?? 60_000
          const key = `${rateKeyFromRequest(req as any)}:${rateCfg.key}`
          const rl = rateLimit(key, rateCfg.limit, windowMs)
          if (!rl.allowed) return err('rate_limited', 429)
        }
        let json: any = undefined
        if (opts.parseJson) {
          json = await (req.json().catch(() => undefined))
          if (json === undefined) return err('bad_json', 400)
        }
        return await handler({ req, params: context?.params, json })
      } catch (e: any) {
        if (opts.onError) {
          const mapped = opts.onError(e)
          if (mapped) return err(mapped.code, mapped.status)
        }
        return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
      }
    }
  }
}
