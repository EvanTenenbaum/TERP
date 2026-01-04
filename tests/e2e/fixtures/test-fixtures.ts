import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
import { prepareAuthState } from "../setup/auth.setup";
import {
  buildTrpcMockResponses,
  defaultTestUser,
} from "../setup/test-data.setup";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { ClientsPage } from "../pages/clients.page";

interface AppFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  clientsPage: ClientsPage;
}

const trpcMocks = buildTrpcMockResponses();

function parseTrpcEndpoints(urlString: string): string[] {
  const url = new URL(urlString);
  const prefix = "/api/trpc/";
  const startIndex = url.pathname.indexOf(prefix);
  if (startIndex === -1) return [];

  const rawPath = url.pathname.slice(startIndex + prefix.length);
  const pathPart = rawPath.split("?")[0];
  return pathPart.split(",").filter(Boolean);
}

async function fulfillTrpc(
  route: Route,
  endpoint: string,
  payload: unknown
): Promise<void> {
  const body = JSON.stringify({ result: { data: { json: payload } } });
  await route.fulfill({ status: 200, contentType: "application/json", body });
}

async function handleTrpcRoute(
  route: Route,
  mockMap: Record<string, unknown>
): Promise<void> {
  const endpoints = parseTrpcEndpoints(route.request().url());
  if (endpoints.length === 0) {
    await route.continue();
    return;
  }

  if (endpoints.some(endpoint => endpoint === "auth.logout")) {
    mockMap["auth.me"] = null;
  }

  if (endpoints.length === 1) {
    const endpoint = endpoints[0];
    if (endpoint === "auth.logout") {
      mockMap["auth.me"] = null;
    }

    const payload = endpoint in mockMap ? mockMap[endpoint] : { success: true };
    await fulfillTrpc(route, endpoint, payload);
    return;
  }

  const batched = endpoints.map((endpoint, index) => ({
    result: {
      data: {
        json:
          endpoint in mockMap
            ? mockMap[endpoint]
            : endpoint === "auth.logout"
              ? { success: true }
              : {},
      },
    },
    error: null,
    id: index,
  }));

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(batched),
  });
}

export const test = base.extend<AppFixtures>({
  context: async ({ browser, baseURL }, runFixture) => {
    const resolvedBase =
      baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
    const authState = await prepareAuthState(resolvedBase);

    const context: BrowserContext = await browser.newContext({
      baseURL: resolvedBase,
      storageState: authState.storageStatePath,
    });

    await context.route("**/api/trpc/**", route =>
      handleTrpcRoute(route, trpcMocks)
    );

    await context.route("**/api/auth/login", async route => {
      const body = JSON.stringify({ success: true, user: defaultTestUser });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body,
      });
    });

    await runFixture(context);
    await context.close();
  },
  page: async ({ context }, runFixture) => {
    const page: Page = await context.newPage();
    await runFixture(page);
    await page.close();
  },
  loginPage: async ({ page }, runFixture) => {
    await runFixture(new LoginPage(page));
  },
  dashboardPage: async ({ page }, runFixture) => {
    await runFixture(new DashboardPage(page));
  },
  clientsPage: async ({ page }, runFixture) => {
    await runFixture(new ClientsPage(page));
  },
});

export { expect };
