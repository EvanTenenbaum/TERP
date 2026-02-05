import type { Page } from "@playwright/test";

export interface EntityCache {
  [entityType: string]: string[];
}

export interface EntityResolutionResult {
  resolvedPath: string | null;
  attemptedStrategies: string[];
  resolvedIds: Record<string, string>;
}

const PARAM_REGEX = /:([a-zA-Z][a-zA-Z0-9_]*)/g;
const PLACEHOLDER_PATTERNS = [":id", "undefined", "null", "nan"];

const ENTITY_ID_PATTERNS: Record<string, RegExp[]> = {
  invoices: [/^INV-\d{8}-\d{5}$/],
  orders: [/^ORD-\d+$/, /^\d+$/],
  clients: [/^[a-f0-9-]{8,}$/i, /^\d+$/],
};

export function extractRouteParameters(path: string): string[] {
  return [...path.matchAll(PARAM_REGEX)].map(match => match[1]);
}

export function replacePathParameter(
  path: string,
  parameter: string,
  value: string
): string {
  return path.replace(`:${parameter}`, value);
}

export function inferEntityTypeFromPath(path: string): string {
  const normalizedSegments = path
    .split("/")
    .filter(segment => segment && !segment.startsWith(":"));

  const semanticSegments = normalizedSegments.filter(
    segment => !/^\d+$/.test(segment) && !/^[a-f0-9-]{8,}$/i.test(segment)
  );

  return semanticSegments[semanticSegments.length - 1] ?? "entities";
}

export function isValidEntityId(
  entityType: string,
  id: string | null | undefined
): id is string {
  if (!id) return false;

  const normalized = id.trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some(pattern => lower.includes(pattern)))
    return false;

  const patterns = ENTITY_ID_PATTERNS[entityType];
  if (!patterns || patterns.length === 0) {
    return !normalized.includes(":") && normalized.length >= 2;
  }

  return patterns.some(pattern => pattern.test(normalized));
}

function listPathForParameter(path: string, parameter: string): string {
  const token = `/:${parameter}`;
  const index = path.indexOf(token);
  if (index < 0) return path;
  return path.slice(0, index);
}

async function strategyDataAttribute(page: Page): Promise<string | null> {
  const firstRow = page.locator("table tbody tr[data-id]").first();
  const count = await firstRow.count();
  if (count === 0) return null;
  return firstRow.getAttribute("data-id");
}

async function strategyLinkHref(page: Page): Promise<string | null> {
  const firstLink = page.locator("table tbody tr a").first();
  if ((await firstLink.count()) === 0) return null;
  const href = await firstLink.getAttribute("href");
  if (!href) return null;

  const match = href.match(/\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function strategyClickRow(page: Page): Promise<string | null> {
  const firstRow = page.locator("table tbody tr").first();
  if ((await firstRow.count()) === 0) return null;

  const startingUrl = page.url();
  await firstRow.click();
  await page.waitForLoadState("domcontentloaded");
  const nextUrl = page.url();

  if (startingUrl === nextUrl) return null;

  const match = nextUrl.match(/\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function strategyVisibleText(page: Page): Promise<string | null> {
  const firstCell = page.locator("table tbody tr td").first();
  if ((await firstCell.count()) === 0) return null;

  const text = (await firstCell.textContent()) ?? "";
  const match = text.match(/[A-Z]+-\d+(?:-\d+)?/);
  return match ? match[0] : null;
}

async function extractEntityId(
  page: Page,
  entityType: string,
  attempts: string[]
): Promise<string | null> {
  const strategies: Array<{ name: string; run: () => Promise<string | null> }> =
    [
      { name: "table-row-data-id", run: () => strategyDataAttribute(page) },
      { name: "table-first-link-href", run: () => strategyLinkHref(page) },
      { name: "table-click-row-url", run: () => strategyClickRow(page) },
      { name: "table-first-cell-text", run: () => strategyVisibleText(page) },
    ];

  for (const strategy of strategies) {
    attempts.push(strategy.name);
    const candidate = await strategy.run();
    if (isValidEntityId(entityType, candidate)) {
      return candidate;
    }
  }

  return null;
}

async function resolveParameter(
  page: Page,
  path: string,
  parameter: string,
  cache: EntityCache,
  attempts: string[]
): Promise<string | null> {
  const basePath = listPathForParameter(path, parameter);
  const entityType = inferEntityTypeFromPath(basePath);

  const cachedId = cache[entityType]?.find(value =>
    isValidEntityId(entityType, value)
  );
  if (cachedId) {
    attempts.push(`cache-hit:${entityType}`);
    return cachedId;
  }

  await page.goto(basePath);
  await page.waitForLoadState("domcontentloaded");
  await page
    .waitForSelector("table, ul, [role='list']", { timeout: 5000 })
    .catch(() => undefined);

  const resolvedId = await extractEntityId(page, entityType, attempts);
  if (!resolvedId) return null;

  cache[entityType] = cache[entityType] ?? [];
  if (!cache[entityType].includes(resolvedId)) {
    cache[entityType].push(resolvedId);
  }

  return resolvedId;
}

export async function resolveParameterizedPath(
  page: Page,
  path: string,
  cache: EntityCache
): Promise<EntityResolutionResult> {
  const params = extractRouteParameters(path);
  if (params.length === 0) {
    return { resolvedPath: path, attemptedStrategies: [], resolvedIds: {} };
  }

  const attemptedStrategies: string[] = [];
  const resolvedIds: Record<string, string> = {};

  let resolvedPath = path;

  for (const parameter of params) {
    const resolvedId = await resolveParameter(
      page,
      resolvedPath,
      parameter,
      cache,
      attemptedStrategies
    );
    if (!resolvedId) {
      return {
        resolvedPath: null,
        attemptedStrategies,
        resolvedIds,
      };
    }

    resolvedIds[parameter] = resolvedId;
    resolvedPath = replacePathParameter(resolvedPath, parameter, resolvedId);
  }

  if (resolvedPath.includes(":")) {
    return {
      resolvedPath: null,
      attemptedStrategies,
      resolvedIds,
    };
  }

  return {
    resolvedPath,
    attemptedStrategies,
    resolvedIds,
  };
}
