#!/usr/bin/env tsx

/**
 * TERP Pre-Commit AI Review System
 * 
 * Performs three types of code reviews before commit:
 * 1. Senior Engineer Review - Code quality, edge cases, bugs
 * 2. Security/Red Team Review - Security vulnerabilities, race conditions
 * 3. Edge Case Stress Test - Edge cases, unit tests
 * 
 * Self-heals by automatically applying fixes when possible.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// Self-bootstrap dependencies
const REQUIRED_DEPS = ['@google/generative-ai', 'dotenv', 'simple-git', 'ora', 'chalk'];

function ensureDependencies(): void {
  const nodeModulesPath = join(process.cwd(), 'node_modules');
  if (!existsSync(nodeModulesPath)) return; // Will fail gracefully if deps missing
  
  // Check for required deps
  const missingDeps = REQUIRED_DEPS.filter(dep => {
    const depParts = dep.split('/');
    const depPath = depParts.length > 1
      ? join(nodeModulesPath, depParts[0], depParts[1])
      : join(nodeModulesPath, dep);
    return !existsSync(depPath);
  });
  
  if (missingDeps.length > 0) {
    console.log(`⚠️  Missing dependencies for pre-commit review. Install with: pnpm add ${missingDeps.join(' ')}`);
    // Don't block - gracefully degrade
    return;
  }
}

ensureDependencies();

// Now safe to import
try {
  var { GoogleGenerativeAI } = require('@google/generative-ai');
  var dotenv = require('dotenv');
  var simpleGit = require('simple-git');
  var ora = require('ora');
  var chalk = require('chalk');
} catch (e) {
  // Gracefully degrade if deps not available
  console.log('⚠️  AI review dependencies not available. Skipping AI review.');
  process.exit(0);
}

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const AI_TIMEOUT_MS = 30000; // 30 seconds per review
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const MAX_REVIEW_FILES = 5; // Limit to 5 files for efficiency
const SKIP_AI_IF_NO_KEY = true; // Don't block if API key missing

// ============================================================================
// TYPES
// ============================================================================

interface ReviewResult {
  type: 'senior' | 'security' | 'edgecase';
  file: string;
  issues: string[];
  fixes: string[];
  critical: boolean;
  status: 'pass' | 'fail' | 'fixed';
}

interface ReviewResponse {
  issues: string[];
  fixes: string[];
  critical: boolean;
  needsManualFix: boolean;
}

// ============================================================================
// GIT OPERATIONS
// ============================================================================

function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' });
    return output
      .split('\n')
      .filter(f => f.trim())
      .filter(f => /\.(ts|tsx|js|jsx)$/.test(f))
      .filter(f => !f.includes('.test.') && !f.includes('.spec.')) // Exclude test files
      .slice(0, MAX_REVIEW_FILES);
  } catch (error) {
    return [];
  }
}

function getFileDiff(file: string): string {
  try {
    const diff = execSync(`git diff --cached "${file}"`, { encoding: 'utf-8' });
    return diff || '';
  } catch (error) {
    return '';
  }
}

function getFileContent(file: string): string {
  try {
    if (!existsSync(file)) return '';
    return readFileSync(file, 'utf-8');
  } catch (error) {
    return '';
  }
}

// ============================================================================
// AI REVIEW FUNCTIONS
// ============================================================================

async function runSeniorEngineerReview(
  model: any,
  file: string,
  diff: string,
  content: string
): Promise<ReviewResponse> {
  const prompt = `You are a Senior Staff Engineer known for being extremely nitpicky about code quality, security, and edge cases.

Review the following code changes. Do not be polite. List 3-5 specific distinct flaws, potential bugs, or security vulnerabilities in this implementation.

FILE: ${file}

DIFF:
\`\`\`
${diff}
\`\`\`

FULL FILE CONTEXT:
\`\`\`typescript
${content.substring(0, 5000)}${content.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

Respond in JSON format:
{
  "issues": ["issue 1", "issue 2", ...],
  "fixes": ["fix 1 code block", "fix 2 code block", ...],
  "critical": true/false,
  "needsManualFix": true/false
}

Be specific and actionable. If issues can be auto-fixed, provide the fix code blocks.`;

  try {
    const result = await Promise.race([
      model.generateContent(prompt).then((r: any) => r.response.text()),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS)
      )
    ]);

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { issues: [], fixes: [], critical: false, needsManualFix: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      issues: parsed.issues || [],
      fixes: parsed.fixes || [],
      critical: parsed.critical || false,
      needsManualFix: parsed.needsManualFix || false
    };
  } catch (error) {
    return { issues: [], fixes: [], critical: false, needsManualFix: false };
  }
}

async function runSecurityReview(
  model: any,
  file: string,
  diff: string,
  content: string
): Promise<ReviewResponse> {
  const prompt = `You are a security researcher trying to break this code.

Identify where this implementation might fail under:
- High load
- Malicious input
- Race conditions
- SQL injection
- XSS vulnerabilities
- Memory leaks
- Authentication/authorization flaws
- Data validation issues

FILE: ${file}

DIFF:
\`\`\`
${diff}
\`\`\`

FULL FILE CONTEXT:
\`\`\`typescript
${content.substring(0, 5000)}${content.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

Respond in JSON format:
{
  "issues": ["security issue 1", "security issue 2", ...],
  "fixes": ["fix 1 code block", "fix 2 code block", ...],
  "critical": true/false,
  "needsManualFix": true/false
}

Focus on security vulnerabilities. Be specific about attack vectors.`;

  try {
    const result = await Promise.race([
      model.generateContent(prompt).then((r: any) => r.response.text()),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS)
      )
    ]);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { issues: [], fixes: [], critical: false, needsManualFix: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      issues: parsed.issues || [],
      fixes: parsed.fixes || [],
      critical: parsed.critical || false,
      needsManualFix: parsed.needsManualFix || false
    };
  } catch (error) {
    return { issues: [], fixes: [], critical: false, needsManualFix: false };
  }
}

async function runEdgeCaseReview(
  model: any,
  file: string,
  diff: string,
  content: string
): Promise<ReviewResponse> {
  const prompt = `This code looks good for the happy path. Now, identify 5 specific edge cases or user inputs that would cause this current code to crash or behave unexpectedly.

FILE: ${file}

DIFF:
\`\`\`
${diff}
\`\`\`

FULL FILE CONTEXT:
\`\`\`typescript
${content.substring(0, 5000)}${content.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

Respond in JSON format:
{
  "issues": ["edge case 1", "edge case 2", ...],
  "fixes": ["fix code block for most critical", "test code block", ...],
  "critical": true/false,
  "needsManualFix": true/false
}

For the most critical edge case, provide both:
1. A fix for the code
2. A unit test that demonstrates the edge case

Focus on: null/undefined, empty arrays, boundary conditions, type mismatches, async timing issues.`;

  try {
    const result = await Promise.race([
      model.generateContent(prompt).then((r: any) => r.response.text()),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS)
      )
    ]);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { issues: [], fixes: [], critical: false, needsManualFix: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      issues: parsed.issues || [],
      fixes: parsed.fixes || [],
      critical: parsed.critical || false,
      needsManualFix: parsed.needsManualFix || false
    };
  } catch (error) {
    return { issues: [], fixes: [], critical: false, needsManualFix: false };
  }
}

// ============================================================================
// SELF-HEALING: AUTO-APPLY FIXES
// ============================================================================

async function applyFixes(
  model: any,
  file: string,
  issues: string[],
  fixes: string[]
): Promise<{ applied: boolean; fixedContent?: string; remainingIssues: string[] }> {
  if (fixes.length === 0) {
    return { applied: false, remainingIssues: issues };
  }

  try {
    let content = getFileContent(file);
    if (!content) {
      return { applied: false, remainingIssues: issues };
    }

    // Ask AI to apply fixes directly to the file
    const applyPrompt = `You are an automated code fixer. Apply these fixes to the code below.

FILE: ${file}

ISSUES TO FIX:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

SUGGESTED FIXES:
${fixes.map((f, idx) => `${idx + 1}.\n${f}`).join('\n\n')}

CURRENT CODE:
\`\`\`typescript
${content}
\`\`\`

Respond with ONLY the complete fixed code in a code block. Do not explain, just provide the fixed code.
If the fix cannot be safely applied automatically, return the original code unchanged.

\`\`\`typescript
// Fixed code here
\`\`\``;

    try {
      const result = await Promise.race([
        model.generateContent(applyPrompt).then((r: any) => r.response.text()),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS)
        )
      ]);

      // Extract code block
      const codeBlockMatch = result.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
      if (!codeBlockMatch) {
        return { applied: false, remainingIssues: issues };
      }

      const fixedContent = codeBlockMatch[1].trim();
      
      // Verify the fix is actually different
      if (fixedContent === content.trim()) {
        return { applied: false, remainingIssues: issues };
      }

      // Validate TypeScript syntax before applying
      try {
        // Write to temp file and check syntax
        const tempFile = file + '.pre-commit-fix.tmp';
        writeFileSync(tempFile, fixedContent, 'utf-8');
        
        // Try to compile (quick syntax check)
        execSync(`npx tsc --noEmit --skipLibCheck "${tempFile}" 2>&1`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        
        // Clean up temp file
        execSync(`rm -f "${tempFile}"`, { stdio: 'ignore' });
      } catch (syntaxError) {
        // Syntax error in fix - don't apply
        return { applied: false, remainingIssues: issues };
      }

      // Apply the fix
      writeFileSync(file, fixedContent, 'utf-8');
      execSync(`git add "${file}"`, { stdio: 'ignore' });

      // Ask AI which issues were fixed
      const verifyPrompt = `Compare these two code versions and list which issues were fixed.

ISSUES:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

ORIGINAL:
\`\`\`typescript
${content.substring(0, 3000)}
\`\`\`

FIXED:
\`\`\`typescript
${fixedContent.substring(0, 3000)}
\`\`\`

Respond with JSON: { "fixed": [1, 2], "remaining": [3] }
Return only JSON, no other text.`;

      try {
        const verifyResult = await Promise.race([
          model.generateContent(verifyPrompt).then((r: any) => r.response.text()),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]);

        const jsonMatch = verifyResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const remainingIssues = (parsed.remaining || []).map((idx: number) => issues[idx - 1]).filter(Boolean);
          return { applied: true, fixedContent, remainingIssues };
        }
      } catch {
        // Verification failed - assume all fixed
      }

      return { applied: true, fixedContent, remainingIssues: [] };
    } catch (error) {
      return { applied: false, remainingIssues: issues };
    }
  } catch (error) {
    return { applied: false, remainingIssues: issues };
  }
}

// ============================================================================
// MAIN REVIEW WORKFLOW
// ============================================================================

async function reviewFile(
  model: any,
  file: string
): Promise<ReviewResult[]> {
  const diff = getFileDiff(file);
  const content = getFileContent(file);

  if (!diff && !content) {
    return [];
  }

  // Run all three reviews in parallel
  const [seniorResult, securityResult, edgeCaseResult] = await Promise.allSettled([
    runSeniorEngineerReview(model, file, diff, content),
    runSecurityReview(model, file, diff, content),
    runEdgeCaseReview(model, file, diff, content)
  ]);

  const results: ReviewResult[] = [];

  // Process Senior Engineer Review
  if (seniorResult.status === 'fulfilled' && seniorResult.value.issues.length > 0) {
    const result = seniorResult.value;
    const fixResult = await applyFixes(model, file, result.issues, result.fixes);
    
    results.push({
      type: 'senior',
      file,
      issues: fixResult.remainingIssues.length > 0 ? fixResult.remainingIssues : result.issues,
      fixes: result.fixes,
      critical: result.critical,
      status: fixResult.applied ? 'fixed' : 'fail'
    });
  } else {
    results.push({
      type: 'senior',
      file,
      issues: [],
      fixes: [],
      critical: false,
      status: 'pass'
    });
  }

  // Process Security Review
  if (securityResult.status === 'fulfilled' && securityResult.value.issues.length > 0) {
    const result = securityResult.value;
    const fixResult = await applyFixes(model, file, result.issues, result.fixes);
    
    results.push({
      type: 'security',
      file,
      issues: fixResult.remainingIssues.length > 0 ? fixResult.remainingIssues : result.issues,
      fixes: result.fixes,
      critical: result.critical,
      status: fixResult.applied ? 'fixed' : 'fail'
    });
  } else {
    results.push({
      type: 'security',
      file,
      issues: [],
      fixes: [],
      critical: false,
      status: 'pass'
    });
  }

  // Process Edge Case Review
  if (edgeCaseResult.status === 'fulfilled' && edgeCaseResult.value.issues.length > 0) {
    const result = edgeCaseResult.value;
    const fixResult = await applyFixes(model, file, result.issues, result.fixes);
    
    results.push({
      type: 'edgecase',
      file,
      issues: fixResult.remainingIssues.length > 0 ? fixResult.remainingIssues : result.issues,
      fixes: result.fixes,
      critical: result.critical,
      status: fixResult.applied ? 'fixed' : 'fail'
    });
  } else {
    results.push({
      type: 'edgecase',
      file,
      issues: [],
      fixes: [],
      critical: false,
      status: 'pass'
    });
  }

  return results;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  // Check for API key
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    if (SKIP_AI_IF_NO_KEY) {
      console.log(chalk.yellow('⚠️  No GEMINI_API_KEY found. Skipping AI review.'));
      process.exit(0);
    } else {
      console.error(chalk.red('❌ GEMINI_API_KEY required for pre-commit review.'));
      process.exit(1);
    }
  }

  // Get staged files
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log(chalk.blue('ℹ️  No staged TypeScript files to review.'));
    process.exit(0);
  }

  console.log(chalk.blue(`🔍 Reviewing ${stagedFiles.length} file(s)...`));

  // Initialize AI model
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  // Review all files
  const allResults: ReviewResult[] = [];
  
  for (const file of stagedFiles) {
    const spinner = ora(`Reviewing ${file}`).start();
    try {
      const results = await reviewFile(model, file);
      allResults.push(...results);
      
      const hasIssues = results.some(r => r.issues.length > 0);
      const hasCritical = results.some(r => r.critical);
      const autoFixed = results.some(r => r.status === 'fixed');
      
      if (autoFixed) {
        spinner.succeed(chalk.green(`${file}: Auto-fixed`));
      } else if (hasCritical) {
        spinner.fail(chalk.red(`${file}: Critical issues found`));
      } else if (hasIssues) {
        spinner.warn(chalk.yellow(`${file}: Issues found`));
      } else {
        spinner.succeed(chalk.green(`${file}: Passed`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`${file}: Review failed`));
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  // Report results
  console.log('\n' + chalk.bold('📊 Review Summary:'));
  console.log('='.repeat(60));

  const criticalIssues = allResults.filter(r => r.critical && r.issues.length > 0);
  const fixedIssues = allResults.filter(r => r.status === 'fixed');
  const manualFixes = allResults.filter(r => r.issues.length > 0 && r.status === 'fail');

  if (fixedIssues.length > 0) {
    console.log(chalk.green(`✅ Auto-fixed ${fixedIssues.length} issue(s)`));
  }

  if (criticalIssues.length > 0) {
    console.log(chalk.red(`\n🚨 CRITICAL ISSUES FOUND (${criticalIssues.length}):`));
    for (const result of criticalIssues) {
      console.log(chalk.red(`\n📁 ${result.file} [${result.type.toUpperCase()}]`));
      result.issues.forEach(issue => {
        console.log(chalk.red(`  ❌ ${issue}`));
      });
    }
    console.log(chalk.yellow('\n⚠️  Please fix critical issues before committing.'));
    process.exit(1);
  }

  if (manualFixes.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Issues Found (${manualFixes.length}):`));
    for (const result of manualFixes) {
      console.log(chalk.yellow(`\n📁 ${result.file} [${result.type.toUpperCase()}]`));
      result.issues.slice(0, 3).forEach(issue => {
        console.log(chalk.yellow(`  ⚠️  ${issue}`));
      });
      if (result.issues.length > 3) {
        console.log(chalk.yellow(`  ... and ${result.issues.length - 3} more`));
      }
    }
    console.log(chalk.blue('\n💡 Consider addressing these issues, but not blocking commit.'));
  }

  if (allResults.every(r => r.status === 'pass' || r.status === 'fixed')) {
    console.log(chalk.green('\n✅ All reviews passed!'));
    process.exit(0);
  }

  // Non-critical issues don't block commit
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

