import { NextResponse } from 'next/server'

export type Ok<T = any> = { success: true } & T
export type Err = { success: false; error: string }

export function ok<T = any>(body?: T, init?: ResponseInit) {
  const payload: Ok<T> = Object.assign({ success: true }, body || {}) as any
  return NextResponse.json(payload, init)
}

export function err(error: string, statusCode = 400, extra?: Record<string, any>) {
  const payload: Err & Record<string, any> = { success: false, error, ...(extra || {}) }
  return NextResponse.json(payload, { status: statusCode })
}
