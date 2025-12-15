#!/usr/bin/env tsx
/**
 * TERP Automated QA Pipeline - Main Entry Point
 * 
 * This script:
 * 1. Parses Playwright test results (JSON)
 * 2. Compares to previous run to identify NEW failures
 * 3. Generates BUG-XXX entries for new failures
 * 4. Appends bugs to MASTER_ROADMAP.md
 * 5. Sends a summary report to Slack
 */

import { existsSync } from 'fs';
import { parsePlaywrightResults } from './parser';
import { loadHistory, saveHistory, saveReport } from './history';
import { getNextBugId, generateBugEntry, appendBugsToRoadmap, createPromptFiles } from './bug-generator';
import { sendSlackReport } from './slack-reporter';
import type { TestFailure, QAReport } from './types';

const PLAYWRIGHT_RESULTS_FILE = 'test-results.json';

async function runPipeline(): Promise<void> {
  console.log('🔍 TERP Automated QA Pipeline\n');
  console.log('='.repeat(60) + '\n');

  // 1. Load history
  console.log('📂 Loading history...');
  const history = loadHistory();
  console.log(`   Known failures: ${history.knownFailures.length}`);
  console.log(`   Last run: ${history.lastRun || 'Never'}\n`);

  // 2. Parse Playwright results
  console.log('📊 Parsing test results...');
  const resultsPath = process.argv[2] || PLAYWRIGHT_RESULTS_FILE;
  
  if (!existsSync(resultsPath)) {
    console.error(`❌ Results file not found: ${resultsPath}`);
    console.log('\nUsage: tsx scripts/qa/index.ts [results-file.json]');
    process.exit(1);
  }
  
  const { stats, failures } = parsePlaywrightResults(resultsPath);
  console.log(`   Total tests: ${stats.totalTests}`);
  console.log(`   Passed: ${stats.passed}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Failures found: ${failures.length}\n`);

  // 3. Identify new vs known failures
  console.log('🔎 Identifying new failures...');
  const newFailures: TestFailure[] = [];
  const knownFailures: TestFailure[] = [];

  for (const failure of failures) {
    if (history.knownFailures.includes(failure.id)) {
      knownFailures.push(failure);
    } else {
      newFailures.push(failure);
    }
  }

  console.log(`   New failures: ${newFailures.length}`);
  console.log(`   Known failures: ${knownFailures.length}\n`);

  // 4. Generate bugs for new failures
  const newBugs: Array<{ id: string; entry: string; failure: TestFailure }> = [];
  
  if (newFailures.length > 0) {
    console.log('🐛 Generating bug entries...');
    
    for (const failure of newFailures) {
      const bugId = getNextBugId();
      const entry = generateBugEntry(bugId, failure);
      newBugs.push({ id: bugId, entry, failure });
      
      history.knownFailures.push(failure.id);
      history.bugMappings[failure.id] = bugId;
      
      console.log(`   ${bugId}: ${failure.testName.substring(0, 50)}...`);
    }
    console.log('');

    // 5. Append to roadmap
    console.log('📝 Updating roadmap...');
    appendBugsToRoadmap(newBugs.map(b => ({ id: b.id, entry: b.entry })));
    console.log(`   Added ${newBugs.length} bugs to MASTER_ROADMAP.md\n`);

    // 6. Create prompt files
    console.log('📄 Creating prompt files...');
    createPromptFiles(newBugs.map(b => ({ id: b.id, failure: b.failure })));
    console.log(`   Created ${newBugs.length} prompt files in docs/prompts/\n`);
  }

  // 7. Update history
  history.lastRun = new Date().toISOString();
  saveHistory(history);

  // 8. Generate report
  const report: QAReport = {
    ...stats,
    runDate: new Date().toISOString(),
    newFailures,
    knownFailures,
    newBugs: newBugs.map(b => b.id),
  };
  saveReport(report);

  // 9. Send Slack notification
  console.log('📤 Sending Slack notification...');
  await sendSlackReport(report);

  // 10. Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ QA Pipeline Complete!\n');
  console.log(`   Tests: ${stats.passed}/${stats.totalTests} passed`);
  console.log(`   New bugs: ${newBugs.length}`);
  console.log(`   Known failures: ${knownFailures.length}`);
  
  if (newBugs.length > 0) {
    console.log('\n   New bugs added:');
    for (const bug of newBugs) {
      console.log(`   - ${bug.id}`);
    }
  }
  
  console.log('');

  if (newFailures.length > 0) {
    process.exit(1);
  }
}

runPipeline().catch(error => {
  console.error('❌ Pipeline failed:', error);
  process.exit(1);
});
