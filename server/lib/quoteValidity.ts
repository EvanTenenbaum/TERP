const DEFAULT_QUOTE_VALID_DAYS = 30;

export function getDefaultQuoteValidUntilDate(): Date {
  return new Date(Date.now() + DEFAULT_QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000);
}

export function resolveQuoteValidUntilDate(
  validUntil?: string | Date | null
): Date {
  if (!validUntil) {
    return getDefaultQuoteValidUntilDate();
  }

  return validUntil instanceof Date ? validUntil : new Date(validUntil);
}
