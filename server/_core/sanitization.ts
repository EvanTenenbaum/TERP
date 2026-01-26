import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content while preserving safe tags
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target"],
  });
}

/**
 * Sanitize text by removing all HTML tags
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Sanitized user input type - preserves structure but marks strings as sanitized
 */
export type SanitizedInput<T> = T extends string
  ? string
  : T extends Array<infer U>
    ? SanitizedInput<U>[]
    : T extends object
      ? { [K in keyof T]: SanitizedInput<T[K]> }
      : T;

/**
 * Recursively sanitize user input (strings, arrays, objects)
 * Removes HTML tags from all string values to prevent XSS
 */
export function sanitizeUserInput<T>(input: T): SanitizedInput<T> {
  if (typeof input === "string") {
    return sanitizeText(input) as SanitizedInput<T>;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeUserInput) as SanitizedInput<T>;
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeUserInput(value);
    }
    return sanitized as SanitizedInput<T>;
  }

  return input as SanitizedInput<T>;
}
