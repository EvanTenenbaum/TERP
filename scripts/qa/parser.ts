/**
 * Playwright Result Parser
 */

import { readFileSync, existsSync } from 'fs';
import type { PlaywrightTestResult, PlaywrightSuite, TestFailure, QAReport } from './types';

function hashFailure(failure: Omit<TestFailure, 'id'>): string {
  const str = `${failure.specFile}::${failure.suiteName}::${failure.testName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function parsePlaywrightResults(resultsPath: string): { stats: QAReport; failures: TestFailure[] } {
  if (!existsSync(resultsPath)) {
    throw new Error(`Playwright results file not found: ${resultsPath}`);
  }

  const results: PlaywrightTestResult = JSON.parse(readFileSync(resultsPath, 'utf-8'));
  const failures: TestFailure[] = [];

  function processSuite(suite: PlaywrightSuite, parentSuite = ''): void {
    const suiteName = parentSuite ? `${parentSuite} > ${suite.title}` : suite.title;

    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'unexpected') {
          const lastResult = test.results[test.results.length - 1];
          const failure: Omit<TestFailure, 'id'> = {
            specFile: suite.file,
            testName: `${spec.title} > ${test.title}`,
            suiteName,
            errorMessage: lastResult?.error?.message || 'Unknown error',
            errorStack: lastResult?.error?.stack,
          };
          failures.push({
            ...failure,
            id: hashFailure(failure),
          });
        }
      }
    }

    for (const nestedSuite of suite.suites || []) {
      processSuite(nestedSuite, suiteName);
    }
  }

  for (const suite of results.suites) {
    processSuite(suite);
  }

  return {
    stats: {
      runDate: results.stats.startTime,
      totalTests: results.stats.expected + results.stats.unexpected + results.stats.flaky + results.stats.skipped,
      passed: results.stats.expected,
      failed: results.stats.unexpected,
      skipped: results.stats.skipped,
      flaky: results.stats.flaky,
      duration: results.stats.duration,
      newFailures: [],
      knownFailures: [],
      newBugs: [],
    },
    failures,
  };
}
