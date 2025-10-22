import { z } from 'zod';

// API Version
export const API_VERSION = 'v1' as const;

// Common schemas
export const UuidSchema = z.string().uuid();
export const DateSchema = z.string().datetime();

// Auth schemas
export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: UuidSchema,
    username: z.string(),
    role: z.enum(['SUPER_ADMIN', 'ACCOUNTING', 'SALES', 'READ_ONLY']),
  }).optional(),
  error: z.string().optional(),
});

// Quote schemas
export const QuoteLineItemSchema = z.object({
  productId: UuidSchema,
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const CreateQuoteRequestSchema = z.object({
  customerId: UuidSchema,
  lineItems: z.array(QuoteLineItemSchema).min(1),
  notes: z.string().optional(),
});

export const QuoteResponseSchema = z.object({
  id: UuidSchema,
  customerId: UuidSchema,
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED']),
  total: z.number(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

// Inventory schemas
export const InventoryAdjustmentRequestSchema = z.object({
  productId: UuidSchema,
  lotId: UuidSchema,
  quantity: z.number(),
  reason: z.string().min(1),
});

// Export types
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type CreateQuoteRequest = z.infer<typeof CreateQuoteRequestSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
export type InventoryAdjustmentRequest = z.infer<typeof InventoryAdjustmentRequestSchema>;
