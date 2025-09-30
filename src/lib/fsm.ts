export const Quote = { DRAFT:'DRAFT', SENT:'SENT', ACCEPTED:'ACCEPTED', CONVERTED:'CONVERTED', VOID:'VOID' } as const
export const Order = { DRAFT:'DRAFT', PENDING_FULFILLMENT:'PENDING_FULFILLMENT', FULFILLED:'FULFILLED', CANCELLED:'CANCELLED', VOID:'VOID' } as const
export const Payment = { PENDING:'PENDING', SETTLED:'SETTLED', VOID:'VOID' } as const

const quoteRules: Record<string,string[]> = {
  DRAFT: ['SENT','VOID'],
  SENT: ['ACCEPTED','VOID'],
  ACCEPTED: ['CONVERTED','VOID'],
  CONVERTED: [],
  VOID: [],
}
export function canTransitionQuote(from: string, to: string) { return quoteRules[from]?.includes(to) ?? false }
