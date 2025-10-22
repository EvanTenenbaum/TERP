// Mock data for THCA ERP - SPEC_ID: THCA_ERP_DESKTOP_UNIFIED_V3
import type {
  Order,
  Client,
  Vendor,
  InventoryItem,
  Invoice,
  Bill,
  User,
  Role,
  Alert,
  Rule,
  PriceBook,
  PriceTier,
  ClientPriceProfile,
  ClientPriceOverride,
  PriceRule,
  Promo,
  BenefitRule,
  SalesSheet,
  SalesConstraint,
  UnitOfMeasure,
  VisibilityRule,
  ClientLicense,
  PaymentTerm,
  DeliveryPreference,
  AddressBook,
  LocationBin,
  Dashboard,
  DocumentTemplate,
  Export,
} from "@/types/entities";

// ============= CLIENTS =============
export const mockClients: Client[] = [
  {
    id: "CL-001",
    name: "Green Valley Dispensary",
    license_number: "LIC-CA-12345",
    contact_email: "orders@greenvalley.com",
    contact_phone: "(555) 123-4567",
    credit_limit: 50000,
    current_balance: 12500,
    status: "Active",
    archived: false,
  },
  {
    id: "CL-002",
    name: "Sunset Cannabis Co.",
    license_number: "LIC-CA-23456",
    contact_email: "purchasing@sunsetcannabis.com",
    contact_phone: "(555) 234-5678",
    credit_limit: 75000,
    current_balance: 8900,
    status: "Active",
    archived: false,
  },
  {
    id: "CL-003",
    name: "Mountain Peak Wellness",
    license_number: "LIC-CA-34567",
    contact_email: "orders@mountainpeak.com",
    contact_phone: "(555) 345-6789",
    credit_limit: 100000,
    current_balance: 0,
    status: "Active",
    archived: false,
  },
];

// ============= VENDORS =============
export const mockVendors: Vendor[] = [
  {
    id: "V-001",
    name: "THCA Farms Inc.",
    license_number: "LIC-CA-FARM-001",
    contact_email: "sales@thcafarms.com",
    contact_phone: "(555) 111-2222",
    credit_terms: "Net 30",
    status: "Active",
    archived: false,
  },
  {
    id: "V-002",
    name: "Premium Genetics Supply",
    license_number: "LIC-CA-FARM-002",
    contact_email: "orders@premiumgenetics.com",
    contact_phone: "(555) 222-3333",
    credit_terms: "Net 15",
    status: "Active",
    archived: false,
  },
];

// ============= INVENTORY =============
export const mockInventory: InventoryItem[] = [
  {
    id: "INV-001",
    strain_name: "Blue Dream THCA",
    type: "Flower",
    category: "Indoor",
    vendor_id: "V-001",
    unit_price: 1200,
    last_cost: 1000,
    qty_available: 150,
    qty_reserved: 25,
    tags: ["Indoor", "Flower"],
    archived: false,
  },
  {
    id: "INV-002",
    strain_name: "OG Kush THCA",
    type: "Flower",
    category: "Indoor",
    vendor_id: "V-001",
    unit_price: 1500,
    last_cost: 1200,
    qty_available: 200,
    qty_reserved: 50,
    tags: ["Indoor", "Flower"],
    archived: false,
  },
  {
    id: "INV-003",
    strain_name: "Gelato THCA Diamonds",
    type: "Concentrate",
    category: "Dep",
    vendor_id: "V-002",
    unit_price: 2800,
    last_cost: 2200,
    qty_available: 80,
    qty_reserved: 10,
    tags: ["Dep", "Concentrate"],
    archived: false,
  },
  {
    id: "INV-004",
    strain_name: "Pineapple Express",
    type: "Flower",
    category: "Outdoor",
    vendor_id: "V-001",
    unit_price: 900,
    last_cost: 700,
    qty_available: 300,
    qty_reserved: 0,
    tags: ["Outdoor", "Flower"],
    archived: false,
  },
  {
    id: "INV-005",
    strain_name: "Berry Gummies",
    type: "Edible",
    category: "Other",
    vendor_id: "V-002",
    unit_price: 25,
    last_cost: 18,
    qty_available: 500,
    qty_reserved: 100,
    tags: ["Other", "Edible"],
    archived: false,
  },
  {
    id: "INV-007",
    strain_name: "Hybrid Vape Cart",
    type: "Vape",
    category: "Vape",
    vendor_id: "V-002",
    unit_price: 16,
    last_cost: 12,
    qty_available: 250,
    qty_reserved: 50,
    tags: ["Vape"],
    archived: false,
  },
];

// ============= ORDERS =============
export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    client_id: "CL-001",
    status: "Confirmed",
    created_at: "2025-10-01T10:00:00Z",
    updated_at: "2025-10-12T14:30:00Z",
    expected_delivery: "2025-10-20",
    total: 18000,
    balance_due: 18000,
    archived: false,
    line_count: 3,
    has_discounts: false,
  },
  {
    id: "ORD-002",
    client_id: "CL-002",
    status: "Shipped",
    created_at: "2025-10-05T11:30:00Z",
    updated_at: "2025-10-13T09:15:00Z",
    expected_delivery: "2025-10-18",
    total: 22500,
    balance_due: 11250,
    archived: false,
    line_count: 2,
    has_discounts: true,
  },
  {
    id: "ORD-003",
    client_id: "CL-003",
    status: "Draft",
    created_at: "2025-10-14T15:00:00Z",
    updated_at: "2025-10-14T15:00:00Z",
    total: 0,
    balance_due: 0,
    archived: false,
    line_count: 0,
    has_discounts: false,
  },
];

// ============= INVOICES =============
export const mockInvoices: Invoice[] = [
  {
    id: "INV-001",
    client_id: "CL-001",
    order_id: "ORD-001",
    issue_date: "2025-10-12",
    due_date: "2025-11-11",
    status: "Sent",
    subtotal: 18000,
    tax: 1800,
    grand_total: 19800,
    balance: 19800,
    archived: false,
  },
  {
    id: "INV-002",
    client_id: "CL-002",
    order_id: "ORD-002",
    issue_date: "2025-10-13",
    due_date: "2025-11-12",
    status: "Paid",
    subtotal: 22500,
    tax: 2250,
    grand_total: 24750,
    balance: 0,
    archived: false,
  },
];

// ============= BILLS =============
export const mockBills: Bill[] = [
  {
    id: "BILL-001",
    vendor_id: "V-001",
    po_id: "PO-001",
    issue_date: "2025-10-15",
    due_date: "2025-11-14",
    status: "Received",
    subtotal: 60000,
    tax: 6000,
    grand_total: 66000,
    balance: 66000,
    archived: false,
  },
];

// ============= USERS =============
export const mockUsers: User[] = [
  {
    id: "U-001",
    name: "Admin User",
    email: "admin@thcaerp.com",
    role_id: "R-001",
    status: "Active",
    last_login: "2025-10-16T09:00:00Z",
  },
  {
    id: "U-002",
    name: "Sales Manager",
    email: "sales@thcaerp.com",
    role_id: "R-002",
    status: "Active",
    last_login: "2025-10-16T08:30:00Z",
  },
];

// ============= ROLES =============
export const mockRoles: Role[] = [
  {
    id: "R-001",
    name: "Admin",
    permissions: [
      { entity: "Sales", actions: ["view", "edit", "admin"] },
      { entity: "Inventory", actions: ["view", "edit", "admin"] },
      { entity: "Finance", actions: ["view", "edit", "admin"] },
    ],
  },
  {
    id: "R-002",
    name: "Sales Manager",
    permissions: [
      { entity: "Sales", actions: ["view", "edit"] },
      { entity: "Inventory", actions: ["view"] },
    ],
  },
];

// ============= ALERTS =============
export const mockAlerts: Alert[] = [
  {
    id: "A-001",
    severity: "warning",
    type: "Low Stock",
    context_type: "inventory",
    context_id: "INV-003",
    message: "Gelato THCA Diamonds stock below 100 units",
    status: "active",
    created_at: "2025-10-15T10:00:00Z",
  },
];

// ============= PRICING SYSTEM =============
export const mockPriceBook: PriceBook[] = [
  {
    id: "PB-INV-001",
    sku: "INV-001",
    inventory_id: "INV-001",
    base_price: 12.5,
    active: true,
  },
  {
    id: "PB-INV-002",
    sku: "INV-002",
    inventory_id: "INV-002",
    base_price: 15.0,
    active: true,
  },
  {
    id: "PB-INV-004",
    sku: "INV-004",
    inventory_id: "INV-004",
    base_price: 9.0,
    active: true,
  },
  {
    id: "PB-INV-005",
    sku: "INV-005",
    inventory_id: "INV-005",
    base_price: 25.0,
    active: true,
  },
  {
    id: "PB-INV-007",
    sku: "INV-007",
    inventory_id: "INV-007",
    base_price: 16.0,
    active: true,
  },
];

export const mockPriceTiers: PriceTier[] = [
  {
    id: "PT-GOLD",
    name: "Gold",
    percent_adjustment: 5.0,
  },
  {
    id: "PT-STANDARD",
    name: "Standard",
    percent_adjustment: 0.0,
  },
];

export const mockClientPriceProfiles: ClientPriceProfile[] = [
  {
    id: "CPP-001",
    client_id: "CL-001",
    tier_id: "PT-GOLD",
    effective_from: "2025-01-01",
  },
];

export const mockClientPriceOverrides: ClientPriceOverride[] = [
  {
    id: "CPO-1",
    client_id: "CL-001",
    inventory_id: "INV-004",
    fixed_price: 5.5,
    effective_from: "2025-09-01",
    effective_to: "2025-12-31",
  },
];

export const mockPriceRules: PriceRule[] = [
  {
    id: "PR-1",
    name: "Vape Promo Oct",
    scope: "client",
    selector: { client_id: "CL-003", tags: ["Vape"] },
    effect_type: "percent",
    effect_value: -10,
    start: "2025-10-01",
    end: "2025-10-31",
    combinable: false,
  },
];

export const mockPromos: Promo[] = [
  {
    id: "PM-1",
    code: "WELCOME10",
    selector: { tags: ["Indoor"] },
    effect_type: "percent",
    effect_value: -10,
    start: "2025-10-01",
    end: "2025-12-31",
    combinable: true,
  },
];

export const mockBenefitRules: BenefitRule[] = [
  {
    id: "BR-1",
    name: "B2G1 Gummies",
    trigger_selector: { inventory_id: "INV-005" },
    trigger_qty: 2,
    benefit_inventory_id: "INV-005",
    benefit_qty: 1,
    start: "2025-10-01",
    end: "2025-12-31",
  },
];

// ============= SALES EXTENSIONS =============
export const mockSalesConstraints: SalesConstraint[] = [
  {
    id: "SC-001",
    inventory_id: "INV-007",
    moq: 10,
    increment: 5,
    default_uom_id: "UOM-CASE",
  },
];

export const mockUOMs: UnitOfMeasure[] = [
  {
    id: "UOM-EACH",
    inventory_id: "INV-007",
    name: "each",
    factor_to_base: 1,
    price_per_uom: 16.0,
  },
  {
    id: "UOM-CASE",
    inventory_id: "INV-007",
    name: "case(10)",
    factor_to_base: 10,
    price_per_uom: 150.0,
  },
];

export const mockVisibilityRules: VisibilityRule[] = [
  {
    id: "VR-001",
    client_id: "CL-001",
    allow_tags: ["Indoor", "Outdoor"],
  },
  {
    id: "VR-002",
    client_id: "CL-002",
    allow_tags: ["Vape", "Edible"],
  },
];

export const mockSalesSheets: SalesSheet[] = [];

// ============= CLIENT COMPLIANCE =============
export const mockClientLicenses: ClientLicense[] = [
  {
    id: "LIC-CL-001",
    client_id: "CL-001",
    number: "LIC-CA-9012",
    state: "CA",
    expires_at: "2026-06-30",
    status: "active",
  },
];

export const mockPaymentTerms: PaymentTerm[] = [
  {
    id: "TERM-30",
    client_id: "CL-001",
    name: "Net 30",
    days: 30,
  },
];

export const mockDeliveryPreferences: DeliveryPreference[] = [
  {
    id: "DP-1",
    client_id: "CL-001",
    window: "9am-2pm",
    instructions: "Side entrance",
  },
];

export const mockAddressBook: AddressBook[] = [
  {
    id: "ADDR-1",
    client_id: "CL-001",
    type: "shipping",
    line1: "123 Market St",
    city: "SF",
    state: "CA",
    zip: "94105",
    is_default: true,
  },
];

// ============= INVENTORY EXTENSIONS =============
export const mockLocationBins: LocationBin[] = [
  {
    id: "BIN-A1",
    name: "A1",
    description: "Flower storage - North wall",
  },
  {
    id: "BIN-B2",
    name: "B2",
    description: "Concentrate storage - Refrigerated",
  },
];

// ============= SYSTEM =============
export const mockDashboards: Dashboard[] = [
  {
    id: "DB-001",
    title: "Business Metrics",
    scope: "org",
    owner_id: "U-001",
    layout: [
      {
        widget_id: "W-TX-1",
        type: "transaction_snapshot",
        x: 0,
        y: 0,
        w: 6,
        h: 6,
        config: {},
      },
      {
        widget_id: "W-INV-1",
        type: "inventory_snapshot",
        x: 6,
        y: 0,
        w: 6,
        h: 6,
        config: { categories: ["Indoor", "Dep", "Outdoor", "Vape", "Other"] },
      },
    ],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

export const mockDocumentTemplates: DocumentTemplate[] = [
  {
    id: "DT-INVOICE-1",
    type: "invoice",
    preset: "modern",
  },
  {
    id: "DT-BILL-1",
    type: "bill",
    preset: "classic",
  },
  {
    id: "DT-SHEET-1",
    type: "sales_sheet",
    preset: "grid",
  },
];

export const mockExports: Export[] = [];

// ============= PURCHASE ORDERS =============
import type { PurchaseOrder, Batch, AuditEvent } from "@/types/entities";

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-001",
    vendor_id: "V-001",
    status: "Submitted",
    total: 60000,
    updated_at: "2025-10-15T10:00:00Z",
    archived: false,
  },
];

export const mockBatches: Batch[] = [
  {
    id: "BATCH-001",
    inventory_id: "INV-001",
    vendor_id: "V-001",
    lot_number: "LOT-2025-001",
    received_date: "2025-10-01",
    expiration_date: "2026-10-01",
    qty: 500,
    cost_per_unit: 10,
    bin_id: "BIN-A1",
    coa_version: 1,
    coa_verified: true,
    status: "Available",
    archived: false,
  },
];

export const mockAuditLog: AuditEvent[] = [];

export const mockRules: Rule[] = [
  {
    id: "RULE-001",
    name: "Low Stock Alert",
    context_type: "inventory",
    field: "qty_available",
    operator: "<=",
    value: "100",
    severity: "warning",
    delivery: "ui",
  },
  {
    id: "RULE-002",
    name: "Critical Low Stock",
    context_type: "inventory",
    field: "qty_available",
    operator: "<=",
    value: "50",
    severity: "critical",
    delivery: "ui,email",
  },
  {
    id: "RULE-003",
    name: "High Reservation Rate",
    context_type: "inventory",
    field: "qty_reserved",
    operator: ">=",
    value: "80",
    severity: "warning",
    delivery: "ui",
  },
];

// ============= HELPER FUNCTIONS =============
export const getClientById = (id: string) => mockClients.find((c) => c.id === id);
export const getVendorById = (id: string) => mockVendors.find((v) => v.id === id);
export const getInventoryById = (id: string) => mockInventory.find((i) => i.id === id);
export const getOrderById = (id: string) => mockOrders.find((o) => o.id === id);
export const getUserById = (id: string) => mockUsers.find((u) => u.id === id);
export const getPOById = (id: string) => mockPurchaseOrders.find((p) => p.id === id);
export const getBatchById = (id: string) => mockBatches.find((b) => b.id === id);
