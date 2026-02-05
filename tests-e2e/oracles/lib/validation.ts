import type { Page } from "@playwright/test";
import { validateDomainSpecific } from "./domain-validators";

export interface SignalEvaluation {
  passed: boolean;
  reasons: string[];
}

export interface ValidationResult {
  passed: boolean;
  signals: {
    http_status_ok: boolean;
    no_404_page: boolean;
    no_error_state: boolean;
    no_loading_state: boolean;
    content_present: boolean;
    domain_validation: boolean;
  };
  failureReasons: string[];
}

export function classifyHttpStatus(
  statusCode: number | null
): SignalEvaluation {
  if (statusCode === null) {
    return { passed: false, reasons: ["No navigation response was returned"] };
  }

  if (statusCode !== 200) {
    return {
      passed: false,
      reasons: [`Expected HTTP 200 but received ${statusCode}`],
    };
  }

  return { passed: true, reasons: [] };
}

export function detect404Indicators(bodyText: string): SignalEvaluation {
  const reasons: string[] = [];
  if (/page not found/i.test(bodyText))
    reasons.push('Body contains "Page Not Found"');
  if (/(^|\s)404(\s|$)/i.test(bodyText))
    reasons.push('Body contains standalone "404"');
  if (/go home/i.test(bodyText)) reasons.push('Body contains "Go Home"');

  return { passed: reasons.length === 0, reasons };
}

export function detectErrorState(bodyText: string): SignalEvaluation {
  const reasons: string[] = [];
  if (/error|failed|something went wrong/i.test(bodyText)) {
    reasons.push("Body contains explicit error language");
  }

  return { passed: reasons.length === 0, reasons };
}

export function detectLoadingState(bodyText: string): SignalEvaluation {
  const reasons: string[] = [];
  if (/loading\.\.\.|please wait/i.test(bodyText)) {
    reasons.push("Body appears to be in loading state");
  }

  return { passed: reasons.length === 0, reasons };
}

export function hasContentPresent(mainContentText: string): SignalEvaluation {
  if (mainContentText.trim().length < 200) {
    return {
      passed: false,
      reasons: [
        `Main content is too short (${mainContentText.trim().length} chars, expected >= 200)`,
      ],
    };
  }

  return { passed: true, reasons: [] };
}

async function hasErrorElements(page: Page): Promise<SignalEvaluation> {
  const reasons: string[] = [];

  const errorElementCount = await page
    .locator(
      '[role="alert"], [class*="error"], [class*="alert"], [class*="warning"]'
    )
    .count();
  if (errorElementCount > 0) {
    reasons.push(`Found ${errorElementCount} potential error elements`);
  }

  return { passed: reasons.length === 0, reasons };
}

async function hasLoadingElements(page: Page): Promise<SignalEvaluation> {
  const reasons: string[] = [];

  const loadingCount = await page
    .locator(
      '[class*="skeleton"], [class*="loading"], [class*="placeholder"], [aria-busy="true"]'
    )
    .count();
  if (loadingCount > 0) {
    reasons.push(`Found ${loadingCount} potential loading indicators`);
  }

  return { passed: reasons.length === 0, reasons };
}

async function has404Elements(page: Page): Promise<SignalEvaluation> {
  const reasons: string[] = [];

  const goHomeButton = await page
    .getByRole("button", { name: /go home/i })
    .count();
  if (goHomeButton > 0) reasons.push('Found "Go Home" button');

  const errorIconCount = await page
    .locator(
      '[class*="error-icon"], svg[class*="error"], [data-testid*="error"]'
    )
    .count();
  if (errorIconCount > 0)
    reasons.push(`Found ${errorIconCount} error icon candidates`);

  return { passed: reasons.length === 0, reasons };
}

export function determineTestResult(
  validation: ValidationResult
): "PASS" | "FAIL" {
  const criticalSignals = [
    validation.signals.http_status_ok,
    validation.signals.no_404_page,
    validation.signals.no_error_state,
    validation.signals.no_loading_state,
  ];

  const requiredSignals = [
    validation.signals.content_present,
    validation.signals.domain_validation,
  ];

  const allCriticalPass = criticalSignals.every(signal => signal);
  const someRequiredPass = requiredSignals.some(signal => signal);

  return allCriticalPass && someRequiredPass ? "PASS" : "FAIL";
}

export async function runValidationSignals(
  page: Page,
  path: string,
  statusCode: number | null
): Promise<ValidationResult> {
  const bodyText = (await page.locator("body").textContent()) || "";
  const mainContent =
    (await page
      .locator("main, [role='main'], #content")
      .first()
      .textContent()) || bodyText;

  const httpSignal = classifyHttpStatus(statusCode);
  const text404Signal = detect404Indicators(bodyText);
  const textErrorSignal = detectErrorState(bodyText);
  const textLoadingSignal = detectLoadingState(bodyText);
  const contentSignal = hasContentPresent(mainContent);

  const dom404Signal = await has404Elements(page);
  const domErrorSignal = await hasErrorElements(page);
  const domLoadingSignal = await hasLoadingElements(page);

  const domainValidation = await validateDomainSpecific(page, path);

  const no404Page = text404Signal.passed && dom404Signal.passed;
  const noErrorState = textErrorSignal.passed && domErrorSignal.passed;
  const noLoadingState = textLoadingSignal.passed && domLoadingSignal.passed;

  const signals: ValidationResult["signals"] = {
    http_status_ok: httpSignal.passed,
    no_404_page: no404Page,
    no_error_state: noErrorState,
    no_loading_state: noLoadingState,
    content_present: contentSignal.passed,
    domain_validation: domainValidation,
  };

  const failureReasons = [
    ...httpSignal.reasons,
    ...text404Signal.reasons,
    ...dom404Signal.reasons,
    ...textErrorSignal.reasons,
    ...domErrorSignal.reasons,
    ...textLoadingSignal.reasons,
    ...domLoadingSignal.reasons,
    ...contentSignal.reasons,
  ];

  if (!domainValidation) {
    failureReasons.push(`Domain validation failed for path "${path}"`);
  }

  const passed =
    determineTestResult({ passed: false, signals, failureReasons }) === "PASS";

  return {
    passed,
    signals,
    failureReasons,
  };
}
