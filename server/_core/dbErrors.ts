/**
 * Shared database error classification utilities.
 *
 * Centralised here so every router uses the same detection logic. When a new
 * MySQL error code or message pattern needs to be recognised, update this one
 * file rather than hunting through individual routers.
 */

interface DbErrorSignal {
  code: string;
  message: string;
}

function collectErrorSignals(error: unknown): DbErrorSignal[] {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const signals: DbErrorSignal[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || current === null || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (typeof current === "string") {
      signals.push({ code: "", message: current.toLowerCase() });
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    const obj = current as Record<string, unknown>;
    const code = String(obj.code ?? obj.errno ?? "").toUpperCase();

    const messageCandidates = [
      obj.message,
      obj.sqlMessage,
      obj.sql,
      obj.detail,
      obj.causeMessage,
    ].filter((value): value is string => typeof value === "string");

    if (messageCandidates.length > 0 || code) {
      signals.push({
        code,
        message: messageCandidates.join(" | ").toLowerCase(),
      });
    }

    const nestedCandidates: unknown[] = [
      obj.cause,
      obj.originalError,
      obj.error,
      obj.parent,
    ];

    if (Array.isArray(obj.errors)) {
      nestedCandidates.push(...obj.errors);
    }

    nestedCandidates.forEach(candidate => {
      if (candidate !== undefined && candidate !== null) {
        queue.push(candidate);
      }
    });
  }

  return signals;
}

function hintsMatch(signals: DbErrorSignal[], hints: string[]): boolean {
  if (hints.length === 0) return true;

  const loweredHints = hints.map(hint => hint.toLowerCase());
  return signals.some(signal =>
    loweredHints.some(hint => signal.message.includes(hint))
  );
}

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
  const signals = collectErrorSignals(error);
  const missingTableSignal = signals.some(({ code, message }) => {
    return (
      code === "1146" ||
      code === "ER_NO_SUCH_TABLE" ||
      message.includes("er_no_such_table") ||
      (message.includes("table") &&
        (message.includes("doesn't exist") ||
          message.includes("does not exist")))
    );
  });

  if (!missingTableSignal) return false;
  return hintsMatch(signals, tableHints);
}

/**
 * Detect schema drift errors (missing tables OR missing columns).
 *
 * Useful for graceful runtime fallbacks in partially migrated environments.
 */
export function isSchemaDriftError(
  error: unknown,
  hints: string[] = []
): boolean {
  const signals = collectErrorSignals(error);

  const schemaDriftSignal = signals.some(({ code, message }) => {
    return (
      code === "1146" ||
      code === "ER_NO_SUCH_TABLE" ||
      code === "1054" ||
      code === "ER_BAD_FIELD_ERROR" ||
      message.includes("er_no_such_table") ||
      message.includes("er_bad_field_error") ||
      (message.includes("table") &&
        (message.includes("doesn't exist") ||
          message.includes("does not exist"))) ||
      message.includes("unknown column") ||
      (message.includes("column") && message.includes("does not exist")) ||
      (message.includes("no such column") && message.includes("sql"))
    );
  });

  if (!schemaDriftSignal) {
    // Drizzle can surface only "Failed query: ..." without nested mysql errno/code.
    // When explicit hints are provided and the failed SQL mentions them, treat as drift.
    if (
      hints.length > 0 &&
      signals.some(({ message }) => message.includes("failed query:")) &&
      hintsMatch(signals, hints)
    ) {
      return true;
    }
    return false;
  }
  return hintsMatch(signals, hints);
}
