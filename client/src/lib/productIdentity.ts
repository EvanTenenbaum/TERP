interface ProductIdentityParts {
  brand?: string | null;
  vendor?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

const normalizeIdentityPart = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "-" ? trimmed : null;
};

const joinUniqueParts = (
  values: Array<string | null | undefined>
): string | null => {
  const seen = new Set<string>();
  const orderedValues = values.flatMap(value => {
    const normalized = normalizeIdentityPart(value);
    if (!normalized || seen.has(normalized)) {
      return [];
    }
    seen.add(normalized);
    return [normalized];
  });

  return orderedValues.length > 0 ? orderedValues.join(" · ") : null;
};

export function buildProductIdentityLines(parts: ProductIdentityParts): {
  secondary: string | null;
  tertiary: string | null;
} {
  return {
    secondary: joinUniqueParts([parts.brand, parts.vendor]),
    tertiary: joinUniqueParts([parts.category, parts.subcategory]),
  };
}
