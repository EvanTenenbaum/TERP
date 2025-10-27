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
 * Recursively sanitize user input (strings, arrays, objects)
 */
export function sanitizeUserInput(input: any): any {
  if (typeof input === "string") {
    return sanitizeText(input);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeUserInput);
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeUserInput(value);
    }
    return sanitized;
  }

  return input;
}

