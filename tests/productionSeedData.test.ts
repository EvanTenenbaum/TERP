import { describe, expect, it } from "vitest";
import clientsData from "../server/db/seed/seedData/clients.json";
import inventoryData from "../server/db/seed/seedData/inventory.json";
import ordersData from "../server/db/seed/seedData/orders.json";

type PaymentTerms =
  | "COD"
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "CONSIGNMENT"
  | "PARTIAL";

interface SeedClient {
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  isBuyer: boolean;
  isSeller: boolean;
  tags: string[];
  tier: string;
}

interface SeedInventoryItem {
  sku: string;
  strain: string;
  strainType: string;
  category: string;
  subcategory: string;
  brand: string;
  unitCogs: number;
  unitPrice: number;
  onHandQty: number;
  reservedQty: number;
  sampleQty: number;
  harvestDate: string;
  packageDate: string;
  potency: { thc: number; cbd: number };
  lotCode: string;
}

interface SeedOrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCogs: number;
  isSample?: boolean;
}

interface SeedOrder {
  orderNumber: string;
  clientCode: string;
  orderDate: string;
  paymentTerms: PaymentTerms;
  saleStatus: string;
  fulfillmentStatus: string;
  items: SeedOrderItem[];
  notes?: string;
}

const clients = clientsData as SeedClient[];
const inventory = inventoryData as SeedInventoryItem[];
const orders = ordersData as SeedOrder[];

describe("Production seed data coherence", () => {
  it("includes realistic client coverage and roles", () => {
    expect(clients.length).toBeGreaterThanOrEqual(50);

    const buyerCount = clients.filter(client => client.isBuyer).length;
    const sellerCount = clients.filter(client => client.isSeller).length;
    expect(buyerCount).toBeGreaterThan(0);
    expect(sellerCount).toBeGreaterThan(0);

    const codes = new Set(clients.map(client => client.code));
    expect(codes.size).toEqual(clients.length);

    clients.forEach(client => {
      expect(client.code).toMatch(/^CLI-\d{4}$/);
      expect(client.name.length).toBeGreaterThan(3);
      expect(client.email).toContain("@");
      expect(client.tags.length).toBeGreaterThan(0);
    });
  });

  it("includes well-formed inventory items with strain coverage", () => {
    expect(inventory.length).toBeGreaterThanOrEqual(200);

    const skus = new Set<string>();
    inventory.forEach(item => {
      expect(item.sku).toMatch(/^[A-Z0-9-]{6,}$/);
      expect(item.strain.length).toBeGreaterThan(2);
      expect(item.unitPrice).toBeGreaterThan(item.unitCogs);
      expect(item.onHandQty).toBeGreaterThan(0);
      expect(new Date(item.harvestDate).getTime()).toBeLessThan(Date.now());
      expect(new Date(item.packageDate).getTime()).toBeLessThan(Date.now());
      skus.add(item.sku);
    });
    expect(skus.size).toEqual(inventory.length);
  });

  it("ensures orders reference valid clients and inventory within the last six months", () => {
    expect(orders.length).toBeGreaterThanOrEqual(100);

    const clientCodes = new Set(clients.map(client => client.code));
    const skus = new Set(inventory.map(item => item.sku));
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    orders.forEach(order => {
      expect(clientCodes.has(order.clientCode)).toBe(true);
      const orderDate = new Date(order.orderDate);
      expect(orderDate.getTime()).toBeGreaterThan(sixMonthsAgo.getTime());
      expect(order.items.length).toBeGreaterThan(0);
      order.items.forEach(item => {
        expect(skus.has(item.sku)).toBe(true);
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.unitPrice).toBeGreaterThan(item.unitCogs);
      });
    });
  });
});
