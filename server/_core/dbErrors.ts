/**
 * Shared database error classification utilities.
 *
 * Centralised here so every router uses the same detection logic. When a new
 * MySQL error code or message pattern needs to be recognised, update this one
 * file rather than hunting through individual routers.
 */

/**
 * Detect MySQL "table does not exist" errors.
 *
 * Optionally narrow to specific tables via `tableHints` – when provided, the
 * error message must mention at least one of the hint strings.
 */
export function isMissingTableError(
  error: unknown,
  tableHints: string[] = []
): boolean {
  const errorObj = error as Record<string, unknown> | null;
  const code = String(errorObj?.code ?? errorObj?.errno ?? "");
  const message = String(errorObj?.message ?? "").toLowerCase();

  const missingTableSignal =
    code === "1146" ||
    code === "ER_NO_SUCH_TABLE" ||
    message.includes("er_no_such_table") ||
    (message.includes("table") &&
      (message.includes("doesn't exist") ||
        message.includes("does not exist")));

  if (!missingTableSignal) return false;
  if (tableHints.length === 0) return true;

  return tableHints.some(hint => message.includes(hint.toLowerCase()));
}
