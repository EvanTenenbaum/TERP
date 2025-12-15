/**
 * TERP QA Pipeline Types
 */

export interface PlaywrightTestResult {
  config: unknown;
  suites: PlaywrightSuite[];
  errors: unknown[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
}

export interface PlaywrightSuite {
  title: string;
  file: string;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

export interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tests: PlaywrightTest[];
}

export interface PlaywrightTest {
  title: string;
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  results: PlaywrightTestRun[];
}

export interface PlaywrightTestRun {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface TestFailure {
  id: string;
  specFile: string;
  testName: string;
  suiteName: string;
  errorMessage: string;
  errorStack?: string;
}

export interface QAHistory {
  lastRun: string;
  knownFailures: string[];
  bugMappings: Record<string, string>;
}

export interface QAReport {
  runDate: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  newFailures: TestFailure[];
  knownFailures: TestFailure[];
  newBugs: string[];
}
