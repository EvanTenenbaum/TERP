import type { ValidationResult } from "./validation";

export enum FailureMode {
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  CANNOT_RESOLVE_ID = "CANNOT_RESOLVE_ID",
  HTTP_404 = "HTTP_404",
  HTTP_500 = "HTTP_500",
  HTTP_403 = "HTTP_403",
  PAGE_NOT_FOUND = "PAGE_NOT_FOUND",
  ERROR_STATE = "ERROR_STATE",
  LOADING_TIMEOUT = "LOADING_TIMEOUT",
  INSUFFICIENT_CONTENT = "INSUFFICIENT_CONTENT",
  DOMAIN_VALIDATION_FAILED = "DOMAIN_VALIDATION_FAILED",
  AUTH_REQUIRED = "AUTH_REQUIRED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export function classifyFailure(
  statusCode: number | null,
  validation: ValidationResult,
  error: Error | null,
  cannotResolveId = false
): FailureMode {
  if (cannotResolveId) return FailureMode.CANNOT_RESOLVE_ID;

  const errorMessage = error?.message.toLowerCase() ?? "";

  if (errorMessage.includes("timeout")) return FailureMode.TIMEOUT;
  if (errorMessage.includes("net::err")) return FailureMode.NETWORK_ERROR;
  if (errorMessage.includes("auth") || errorMessage.includes("unauthorized")) {
    return FailureMode.AUTH_REQUIRED;
  }
  if (errorMessage.includes("session") && errorMessage.includes("expired")) {
    return FailureMode.SESSION_EXPIRED;
  }

  if (statusCode === 404) return FailureMode.HTTP_404;
  if (statusCode === 500) return FailureMode.HTTP_500;
  if (statusCode === 403) return FailureMode.HTTP_403;

  if (!validation.signals.no_404_page) return FailureMode.PAGE_NOT_FOUND;
  if (!validation.signals.no_error_state) return FailureMode.ERROR_STATE;
  if (!validation.signals.no_loading_state) return FailureMode.LOADING_TIMEOUT;
  if (!validation.signals.content_present)
    return FailureMode.INSUFFICIENT_CONTENT;
  if (!validation.signals.domain_validation)
    return FailureMode.DOMAIN_VALIDATION_FAILED;

  return FailureMode.UNKNOWN_ERROR;
}
