/**
 * Slack Reporter for QA Pipeline
 */

import type { QAReport } from './types';

export async function sendSlackReport(report: QAReport, webhookUrl?: string): Promise<void> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  
  if (!url) {
    console.log('⚠️ No Slack webhook URL configured, skipping notification');
    return;
  }

  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

  const durationMin = Math.round(report.duration / 60000);
  const passRate = report.totalTests > 0 
    ? Math.round((report.passed / report.totalTests) * 100) 
    : 0;

  const statusEmoji = report.failed === 0 ? '✅' : report.newFailures.length > 0 ? '🚨' : '⚠️';
  
  let message = `${statusEmoji} *TERP Daily QA Report* - ${new Date().toLocaleDateString()}\n\n`;
  message += `📊 *Test Results:*\n`;
  message += `• Passed: ${report.passed}/${report.totalTests} (${passRate}%)\n`;
  message += `• Failed: ${report.failed}\n`;
  message += `• Skipped: ${report.skipped}\n`;
  message += `• Flaky: ${report.flaky}\n`;
  message += `• Duration: ${durationMin}m\n\n`;

  if (report.newFailures.length > 0) {
    message += `🆕 *NEW BUGS FOUND (${report.newFailures.length}):*\n`;
    for (let i = 0; i < Math.min(report.newFailures.length, 5); i++) {
      const f = report.newFailures[i];
      const bugId = report.newBugs[i] || 'TBD';
      message += `• \`${bugId}\`: ${f.testName.substring(0, 40)}...\n`;
      message += `  └─ \`${f.specFile}\`\n`;
    }
    if (report.newFailures.length > 5) {
      message += `  _...and ${report.newFailures.length - 5} more_\n`;
    }
    message += `\n📋 Added to roadmap: \`MASTER_ROADMAP.md\`\n`;
  } else if (report.failed > 0) {
    message += `📌 *Known Failures (${report.knownFailures.length}):*\n`;
    message += `_All failures are already tracked in the roadmap._\n`;
  } else {
    message += `🎉 *All tests passing!*\n`;
  }

  if (runUrl) {
    message += `\n🔗 <${runUrl}|View Full Report>`;
  }

  const payload = {
    text: message,
    unfurl_links: false,
    unfurl_media: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error(`Slack notification failed: ${response.status}`);
    } else {
      console.log('✅ Slack notification sent');
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}
