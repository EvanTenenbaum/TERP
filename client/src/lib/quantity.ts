export function normalizePositiveInteger(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (normalized < 1) {
    return null;
  }

  return normalized;
}

export function parsePositiveInteger(value: string | number): number | null {
  if (typeof value === "number") {
    return normalizePositiveInteger(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return normalizePositiveInteger(Number(trimmed));
}

export function normalizePositiveIntegerWithin(
  value: string | number,
  max: number
): number | null {
  const normalized = parsePositiveInteger(value);
  if (normalized === null) {
    return null;
  }

  const maxNormalized = normalizePositiveInteger(max);
  if (maxNormalized === null) {
    return null;
  }

  return Math.min(normalized, maxNormalized);
}
