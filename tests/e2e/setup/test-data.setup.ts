export interface TestUser {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: string;
  lastSignedIn: string;
}

export interface TestClient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  teriCode?: string;
}

export const defaultTestUser: TestUser = {
  id: 1,
  openId: "e2e-user",
  email: "e2e-user@terp.test",
  name: "E2E User",
  role: "admin",
  lastSignedIn: new Date().toISOString(),
};

export const mockClients: TestClient[] = [
  {
    id: 101,
    name: "Acme Retail",
    email: "ops@acme.test",
    phone: "555-0101",
    teriCode: "ACME",
  },
  {
    id: 102,
    name: "Northwind Farms",
    email: "contact@northwind.test",
    phone: "555-0102",
    teriCode: "NWF",
  },
];

export function buildTrpcMockResponses(): Record<string, unknown> {
  const pagination = {
    limit: 50,
    offset: 0,
  };

  return {
    "auth.me": defaultTestUser,
    "clients.list": {
      items: mockClients,
      total: mockClients.length,
      ...pagination,
    },
    "clients.count": mockClients.length,
    "notifications.list": { items: [], unreadCount: 0 },
    "inventory.list": { items: [], hasMore: false, nextCursor: null },
    "orders.getAll": { items: [], total: 0, ...pagination },
    "dashboard.getAll": { items: [], total: 0, ...pagination },
  };
}
