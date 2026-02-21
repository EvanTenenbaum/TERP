import type { Locator, Page, APIResponse } from "@playwright/test";

interface TrpcResponse<T> {
  result: {
    data: {
      json: T;
    };
  };
}

interface InventoryListItem {
  batch: {
    id: number;
  };
  product?: {
    nameCanonical?: string | null;
    name?: string | null;
  };
  brand?: {
    name?: string | null;
  };
}

interface InventoryListResponse {
  items: InventoryListItem[];
  nextCursor: number | null;
  hasMore: boolean;
}

interface BatchCleanupResult {
  batchIds: number[];
  updatedCount: number;
  skipped?: boolean;
}

const DEFAULT_BASE_URL = "http://localhost:5173";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTrpcResponse = <T>(value: unknown): value is TrpcResponse<T> => {
  if (!isRecord(value)) return false;
  const result = value.result;
  if (!isRecord(result)) return false;
  const data = result.data;
  if (!isRecord(data)) return false;
  return "json" in data;
};

const resolveBaseUrl = (): string =>
  process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL;

const buildTrpcUrl = (
  path: string,
  input?: Record<string, unknown>
): string => {
  const baseUrl = resolveBaseUrl();
  const trimmedPath = path.replace(/^\//, "");
  const url = new URL(`/api/trpc/${trimmedPath}`, baseUrl);

  if (input) {
    url.searchParams.set("input", JSON.stringify({ json: input }));
  }

  return url.toString();
};

const assertOk = async (
  response: APIResponse,
  context: string
): Promise<void> => {
  if (!response.ok()) {
    throw new Error(
      `${context} failed with status ${response.status()}: ${response.statusText()}`
    );
  }
};

export const getAgGridCell = (
  page: Page,
  rowIndex: number,
  columnId: string
): Locator =>
  page.locator(
    `.ag-center-cols-container .ag-row[row-index="${rowIndex}"] [col-id="${columnId}"]`
  );

export const readAgGridCellText = async (
  page: Page,
  rowIndex: number,
  columnId: string
): Promise<string> => {
  const cell = getAgGridCell(page, rowIndex, columnId).first();
  await cell.scrollIntoViewIfNeeded();
  const text = await cell.textContent();
  return text?.trim() ?? "";
};

export const fillAgGridTextCell = async (
  page: Page,
  rowIndex: number,
  columnId: string,
  value: string
): Promise<void> => {
  const cell = getAgGridCell(page, rowIndex, columnId).first();
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Control+A");
  await page.keyboard.type(value);
  await page.keyboard.press("Enter");
};

export const selectAgGridFirstOption = async (
  page: Page,
  rowIndex: number,
  columnId: string
): Promise<void> => {
  const cell = getAgGridCell(page, rowIndex, columnId).first();
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
};

export const waitForToast = async (
  page: Page,
  message: string
): Promise<void> => {
  const toast = page.locator(
    `[data-sonner-toaster] :text("${message}") , .sonner-toast:has-text("${message}")`
  );
  await toast.first().waitFor({ state: "visible", timeout: 10000 });
};

export const trpcQuery = async <T>(
  page: Page,
  path: string,
  input?: Record<string, unknown>
): Promise<T> => {
  const response = await page.request.get(buildTrpcUrl(path, input));
  await assertOk(response, `tRPC query ${path}`);
  const payload = (await response.json()) as unknown;

  if (!isTrpcResponse<T>(payload)) {
    throw new Error(`Unexpected tRPC response shape for ${path}`);
  }

  return payload.result.data.json;
};

export const trpcMutation = async <T>(
  page: Page,
  path: string,
  input: Record<string, unknown>
): Promise<T> => {
  const response = await page.request.post(buildTrpcUrl(path), {
    data: { json: input },
    headers: { "Content-Type": "application/json" },
  });

  await assertOk(response, `tRPC mutation ${path}`);
  const payload = (await response.json()) as unknown;

  if (!isTrpcResponse<T>(payload)) {
    throw new Error(`Unexpected tRPC response shape for ${path}`);
  }

  return payload.result.data.json;
};

export const fetchInventoryByQuery = async (
  page: Page,
  query: string
): Promise<InventoryListResponse> =>
  trpcQuery<InventoryListResponse>(page, "inventory.list", {
    query,
    limit: 50,
  });

export const closeInventoryBatches = async (
  page: Page,
  batchIds: number[]
): Promise<void> => {
  if (batchIds.length === 0) return;

  await trpcMutation(page, "inventory.bulk.updateStatus", {
    batchIds,
    newStatus: "CLOSED",
  });
};

export const cleanupBatchesByBrandName = async (
  page: Page,
  brandName: string
): Promise<BatchCleanupResult> => {
  const isCleanupSkippable = (message: string): boolean =>
    message.includes("status 401") ||
    message.includes("status 403") ||
    message.includes("status 500");

  let list: InventoryListResponse;
  try {
    list = await fetchInventoryByQuery(page, brandName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isCleanupSkippable(message)) {
      return {
        batchIds: [],
        updatedCount: 0,
        skipped: true,
      };
    }
    throw error;
  }

  const batchIds = list.items
    .filter(item => item.brand?.name === brandName)
    .map(item => item.batch.id);

  try {
    await closeInventoryBatches(page, batchIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isCleanupSkippable(message)) {
      throw error;
    }
  }

  return {
    batchIds,
    updatedCount: batchIds.length,
  };
};
