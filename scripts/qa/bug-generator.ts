/**
 * Bug Entry Generator
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { TestFailure } from './types';

const ROADMAP_FILE = 'docs/roadmaps/MASTER_ROADMAP.md';

let lastAssignedBugId = 0;

export function getNextBugId(): string {
  const roadmap = readFileSync(ROADMAP_FILE, 'utf-8');
  const bugMatches = roadmap.matchAll(/BUG-(\d+)/g);
  let maxId = 0;
  
  for (const match of bugMatches) {
    const id = parseInt(match[1], 10);
    if (id > maxId) maxId = id;
  }
  
  const nextId = Math.max(maxId, lastAssignedBugId) + 1;
  lastAssignedBugId = nextId;
  
  return `BUG-${String(nextId).padStart(3, '0')}`;
}

export function generateBugEntry(bugId: string, failure: TestFailure): string {
  const today = new Date().toISOString().split('T')[0];
  const shortError = failure.errorMessage.split('\n')[0].substring(0, 100);
  const modulePath = failure.specFile.replace('tests-e2e/', '');
  
  return `
### ${bugId}: E2E Test Failure - ${failure.testName.substring(0, 50)}

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4h
**Module:** \`${modulePath}\`
**Dependencies:** None
**Prompt:** \`docs/prompts/${bugId}.md\`
**Discovered:** ${today} (Automated QA Pipeline)

**Problem:** E2E test "${failure.testName}" is failing.

**Error:** \`${shortError}\`

**Test Location:** \`${failure.specFile}\`

**Objectives:**

- Investigate the root cause of the test failure
- Fix the underlying bug in the application code
- Verify the test passes after the fix
- Ensure no regression in related functionality

**Deliverables:**

- [ ] Root cause identified and documented
- [ ] Bug fix implemented
- [ ] Test passes consistently (run 3x)
- [ ] No new TypeScript errors
- [ ] Related tests still pass
- [ ] Code reviewed and merged

---
`;
}

export function generatePromptFile(bugId: string, failure: TestFailure): string {
  return `# ${bugId}: E2E Test Failure Fix

## Task Overview

**Bug ID:** ${bugId}
**Priority:** MEDIUM
**Estimate:** 4h
**Discovered:** ${new Date().toISOString().split('T')[0]}

## Problem Description

An automated E2E test is failing. This was discovered by the TERP Automated QA Pipeline.

**Test Name:** ${failure.testName}
**Test File:** ${failure.specFile}
**Suite:** ${failure.suiteName}

## Error Details

\`\`\`
${failure.errorMessage}
\`\`\`

${failure.errorStack ? `### Stack Trace\n\`\`\`\n${failure.errorStack.substring(0, 1000)}\n\`\`\`` : ''}

## Investigation Steps

1. **Reproduce the failure locally:**
   \`\`\`bash
   pnpm test:e2e ${failure.specFile}
   \`\`\`

2. **Check recent changes** to files related to this test

3. **Identify the root cause** - is it:
   - A bug in application code?
   - A flaky test that needs fixing?
   - A test that needs updating due to intentional changes?

4. **Implement the fix**

5. **Verify the fix:**
   \`\`\`bash
   pnpm test:e2e ${failure.specFile} --repeat-each=3
   \`\`\`

## Acceptance Criteria

- [ ] Test passes consistently (3 consecutive runs)
- [ ] Root cause documented in commit message
- [ ] No regression in related tests
- [ ] No new TypeScript errors

## Related Files

- Test file: \`${failure.specFile}\`
- Check page objects in: \`tests-e2e/page-objects/\`
- Check fixtures in: \`tests-e2e/fixtures/\`
`;
}

export function appendBugsToRoadmap(bugs: Array<{ id: string; entry: string }>): void {
  if (bugs.length === 0) return;

  let roadmap = readFileSync(ROADMAP_FILE, 'utf-8');
  const qaSectionMarker = '## 🤖 Automated QA Discoveries';
  
  if (!roadmap.includes(qaSectionMarker)) {
    const insertPoint = roadmap.indexOf('\n## ');
    if (insertPoint > 0) {
      roadmap = roadmap.slice(0, insertPoint) + 
        `\n${qaSectionMarker}\n\nBugs discovered by the automated QA pipeline.\n\n---\n` +
        roadmap.slice(insertPoint);
    }
  }
  
  const sectionStart = roadmap.indexOf(qaSectionMarker);
  const sectionEnd = roadmap.indexOf('\n---\n', sectionStart) + 5;
  
  const bugsContent = bugs.map(b => b.entry).join('\n');
  roadmap = roadmap.slice(0, sectionEnd) + bugsContent + roadmap.slice(sectionEnd);
  
  writeFileSync(ROADMAP_FILE, roadmap);
}

export function createPromptFiles(bugs: Array<{ id: string; failure: TestFailure }>): void {
  const promptsDir = 'docs/prompts';
  if (!existsSync(promptsDir)) {
    mkdirSync(promptsDir, { recursive: true });
  }
  
  for (const { id, failure } of bugs) {
    const promptPath = join(promptsDir, `${id}.md`);
    writeFileSync(promptPath, generatePromptFile(id, failure));
  }
}
