/**
 * QA History Management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { QAHistory, QAReport } from './types';

const RESULTS_DIR = 'qa-results';
const HISTORY_FILE = join(RESULTS_DIR, 'history.json');
const LATEST_REPORT_FILE = join(RESULTS_DIR, 'latest-report.json');

export function loadHistory(): QAHistory {
  if (!existsSync(HISTORY_FILE)) {
    return {
      lastRun: '',
      knownFailures: [],
      bugMappings: {},
    };
  }
  return JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
}

export function saveHistory(history: QAHistory): void {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function saveReport(report: QAReport): void {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  writeFileSync(LATEST_REPORT_FILE, JSON.stringify(report, null, 2));
}
