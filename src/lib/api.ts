import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { rateKeyFromRequest, rateLimit } from '@/lib/rateLimit'
import { ok, err } from '@/lib/http'
import type { ZodTypeAny } from 'zod'

export type ApiOptions = {
  roles?: string[]
  rate?: { key: string; limit: number; windowMs?: number }
  postingLock?: boolean
  parseJson?: boolean
  bodySchema?: ZodTypeAny
  querySchema?: ZodTypeAny
  onError?: (e: any) => { code: string; status: number } | undefined
}

type HandlerCtx<T = any, Q = any> = {
  req: Request
  params?: Record<string, string>
  json?: T
  query?: Q
}

export function api<TBody = any, TQuery = any>(opts: ApiOptions) {
  return function <R = any>(handler: (ctx: HandlerCtx<TBody, TQuery>) => Promise<Response> | Response) {
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
        // Observability scope
        try { const { setRequestScope } = await import('@/lib/observability'); setRequestScope(req, rateCfg?.key || new URL(req.url).pathname) } catch {}
        // Apply rate limiting: explicit config wins, else default for mutating endpoints
        if (opts.rate || isMutating) {
          const rateCfg = opts.rate ?? { key: new URL(req.url).pathname.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, ''), limit: 60 }
          const windowMs = rateCfg.windowMs ?? 60_000
          const key = `${rateKeyFromRequest(req as any)}:${rateCfg.key}`
          const rl = rateLimit(key, rateCfg.limit, windowMs)
          if (!rl.allowed) return err('rate_limited', 429)
        }
        // Parse query
        const sp = new URL(req.url).searchParams
        const queryObj: Record<string, any> = {}
        sp.forEach((v, k) => {
          if (k in queryObj) queryObj[k] = Array.isArray(queryObj[k]) ? [...queryObj[k], v] : [queryObj[k], v]
          else queryObj[k] = v
        })
        let query: any = queryObj
        if (opts.querySchema) {
          const parsed = opts.querySchema.safeParse(queryObj)
          if (!parsed.success) return err('validation_error', 400, { issues: parsed.error.issues })
          query = parsed.data
        }
        // Parse body
        let json: any = undefined
        if (opts.parseJson || opts.bodySchema) {
          json = await (req.json().catch(() => undefined))
          if (json === undefined) return err('bad_json', 400)
          if (opts.bodySchema) {
            const parsed = opts.bodySchema.safeParse(json)
            if (!parsed.success) return err('validation_error', 400, { issues: parsed.error.issues })
            json = parsed.data
          }
        }
        return await handler({ req, params: context?.params, json, query })
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
