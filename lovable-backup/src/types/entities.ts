// THCA ERP Entity Type Definitions
// Based on SPEC_ID: THCA_ERP_DESKTOP_UNIFIED_V3

// ============= GLOBAL ENUMS =============
export type OrderStatus = "Draft" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled";
export type POStatus = "Draft" | "Submitted" | "Received" | "Cancelled";
export type BatchStatus = "Quarantined" | "Available" | "Reserved" | "Depleted";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Void";
export type BillStatus = "Draft" | "Received" | "Paid" | "Overdue" | "Void";
export type AlertSeverity = "info" | "warning" | "critical";
export type EntityVisibility = "active" | "archived";
export type PriceSource = "override" | "rule" | "tier" | "base" | "promo" | "uom_scale";
export type DiscrepancyType = "damaged" | "short";
export type AddressType = "shipping" | "billing";
export type AppRole = "view" | "edit" | "admin";

// ============= SALES ENTITIES =============
export interface Order {
  id: string;
  client_id: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  expected_delivery?: string;
  total: number;
  balance_due: number;
  archived: boolean;
  line_count?: number;
  has_discounts?: boolean;
}

export interface OrderLine {
  id: string;
  order_id: string;
  inventory_id: string;
  inventory_name: string;
  qty: number;
  uom?: string;
  unit_price: number;
  discount_percent?: number;
  promo_code?: string;
  price_source?: PriceSource;
  line_total: number;
}

export interface OrderNote {
  id: string;
  order_id: string;
  text: string;
  created_by: string;
  created_at: string;
}

export interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface PaymentLink {
  order_id: string;
  invoice_id: string;
  amount: number;
  method: string;
  reference: string;
  timestamp: string;
}

// ============= INVENTORY ENTITIES =============
export interface InventoryItem {
  id: string;
  strain_name: string;
  type: string;
  category?: string;
  vendor_id: string;
  unit_price: number;
  last_cost?: number;
  qty_available: number;
  qty_reserved: number;
  tags?: string[];
  archived: boolean;
}

export interface Batch {
  id: string;
  inventory_id: string;
  vendor_id: string;
  lot_number: string;
  received_date: string;
  expiration_date?: string;
  qty: number;
  cost_per_unit: number;
  bin_id?: string;
  coa_version?: number;
  coa_verified: boolean;
  coa_files?: string[];
  quarantine_reason?: string;
  status: BatchStatus;
  archived: boolean;
}

export interface COA {
  id: string;
  batch_id: string;
  file_name: string;
  uploaded_at: string;
  verified_by: string;
}

export interface ImportJob {
  id: string;
  module: string;
  file_name: string;
  status: string;
  error_log_link?: string;
}

export interface LocationBin {
  id: string;
  name: string;
  description?: string;
}

export interface ItemVendor {
  id: string;
  inventory_id: string;
  vendor_id: string;
  preferred: boolean;
  last_cost: number;
  lead_time_days: number;
}

export interface Discrepancy {
  id: string;
  po_id?: string;
  batch_id?: string;
  type: DiscrepancyType;
  qty: number;
  notes?: string;
  created_at: string;
}

// ============= CLIENT ENTITIES =============
export interface Client {
  id: string;
  name: string;
  license_number: string;
  contact_email: string;
  contact_phone: string;
  credit_limit: number;
  current_balance: number;
  status: string;
  archived: boolean;
}

export interface ClientNote {
  id: string;
  client_id: string;
  text: string;
  created_at: string;
  created_by: string;
}

export interface ClientAlert {
  id: string;
  client_id: string;
  type: string;
  severity: AlertSeverity;
  status: string;
  created_at: string;
}

export interface ClientLicense {
  id: string;
  client_id: string;
  number: string;
  state: string;
  expires_at: string;
  status: "active" | "expired" | "suspended";
}

export interface PaymentTerm {
  id: string;
  client_id: string;
  name: string;
  days: number;
}

export interface DeliveryPreference {
  id: string;
  client_id: string;
  window: string;
  instructions: string;
}

export interface AddressBook {
  id: string;
  client_id: string;
  type: AddressType;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  is_default: boolean;
}

// ============= VENDOR ENTITIES =============
export interface Vendor {
  id: string;
  name: string;
  license_number: string;
  contact_email: string;
  contact_phone: string;
  credit_terms: string;
  status: string;
  archived: boolean;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  status: POStatus;
  created_at?: string;
  expected_delivery?: string;
  total: number;
  updated_at: string;
  archived: boolean;
  line_count?: number;
}

export interface POLine {
  id: string;
  po_id: string;
  inventory_id: string;
  qty_ordered: number;
  qty_received: number;
  qty_damaged?: number;
  unit_price: number;
  line_total: number;
}

// ============= FINANCE ENTITIES =============
export interface Invoice {
  id: string;
  client_id: string;
  order_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  grand_total: number;
  balance: number;
  archived: boolean;
}

export interface Bill {
  id: string;
  vendor_id: string;
  po_id: string;
  issue_date: string;
  due_date: string;
  status: BillStatus;
  subtotal: number;
  tax: number;
  grand_total: number;
  balance: number;
  archived: boolean;
}

export interface Payment {
  id: string;
  invoice_id_or_bill_id: string;
  date: string;
  method: string;
  amount: number;
  reference: string;
}

export interface CreditMemo {
  id: string;
  bill_id: string;
  amount: number;
  reason: string;
  applied: boolean;
}

export interface Adjustment {
  id: string;
  target_type: string;
  target_id: string;
  type: string;
  amount: number;
  note: string;
  timestamp: string;
}

// ============= PRICING SYSTEM =============
export interface PriceBook {
  id: string;
  sku: string;
  inventory_id: string;
  base_price: number;
  active: boolean;
}

export interface PriceTier {
  id: string;
  name: string;
  percent_adjustment: number;
}

export interface ClientPriceProfile {
  id: string;
  client_id: string;
  tier_id: string;
  effective_from: string;
  effective_to?: string;
}

export interface ClientPriceOverride {
  id: string;
  client_id: string;
  inventory_id: string;
  fixed_price: number;
  effective_from: string;
  effective_to?: string;
}

export interface PriceRule {
  id: string;
  name: string;
  scope: "client" | "segment";
  selector: any;
  effect_type: "percent" | "fixed";
  effect_value: number;
  start: string;
  end?: string;
  combinable: boolean;
}

export interface Promo {
  id: string;
  code: string;
  selector: any;
  effect_type: "percent" | "fixed";
  effect_value: number;
  start: string;
  end?: string;
  combinable: boolean;
}

export interface BenefitRule {
  id: string;
  name: string;
  trigger_selector: any;
  trigger_qty: number;
  benefit_inventory_id: string;
  benefit_qty: number;
  start: string;
  end?: string;
}

// ============= SALES EXTENSIONS =============
export interface SalesSheet {
  id: string;
  client_id: string;
  filter_tags: string[];
  include_images: boolean;
  include_coa_links: boolean;
  file_link: string;
  format: "pdf" | "csv";
  expires_at: string;
  created_at: string;
}

export interface SalesConstraint {
  id: string;
  inventory_id: string;
  moq: number;
  increment: number;
  default_uom_id: string;
}

export interface UnitOfMeasure {
  id: string;
  inventory_id: string;
  name: string;
  factor_to_base: number;
  price_per_uom?: number;
}

export interface VisibilityRule {
  id: string;
  client_id: string;
  allow_tags?: string[];
  deny_tags?: string[];
  allow_vendors?: string[];
  deny_vendors?: string[];
}

export interface SubstitutionPolicy {
  id: string;
  client_id: string;
  order_id?: string;
  line_id?: string;
  allowed: boolean;
  category_scope?: string[];
}

export interface ReserveHold {
  id: string;
  order_line_id: string;
  qty: number;
  expires_at?: string;
  released_at?: string;
  created_at: string;
}

// ============= ALERTS ENTITIES =============
export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: string;
  context_type: string;
  context_id: string;
  message: string;
  status: string;
  created_at: string;
}

export interface Rule {
  id: string;
  name: string;
  context_type: string;
  field: string;
  operator: string;
  value: string;
  severity: AlertSeverity;
  delivery: string;
}

// ============= ADMIN ENTITIES =============
export interface User {
  id: string;
  name: string;
  email: string;
  role_id: string;
  status: string;
  last_login?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  entity: string;
  actions: AppRole[];
}

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
}

// ============= SYSTEM =============
export interface SavedView {
  id: string;
  user_id: string;
  module: string;
  name: string;
  filters: any;
  columns: string[];
  sort: any;
  is_default: boolean;
  created_at: string;
}

export interface Dashboard {
  id: string;
  title: string;
  scope: "user" | "org";
  owner_id: string;
  layout: DashboardWidget[];
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  widget_id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: any;
}

export interface DocumentTemplate {
  id: string;
  type: "invoice" | "bill" | "sales_sheet";
  preset: "modern" | "classic" | "grid";
}

export interface Export {
  id: string;
  user_id: string;
  type: string;
  format: "csv" | "pdf";
  file_url: string;
  expires_at: string;
  created_at: string;
  size_bytes?: number;
  status: "processing" | "ready" | "expired";
  records_count?: number;
  errors_count?: number;
}

// ============= AUDIT ENTITIES =============
export interface AuditEvent {
  id: string;
  timestamp: string;
  user_id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before: any;
  after: any;
  ui_context: string;
}
