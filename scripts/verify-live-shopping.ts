/**
 * Live Shopping Integration Verification Script
 * 
 * Checks for existence of schema, services, and configuration
 * to ensure Live Shopping feature is ready for deployment.
 * 
 * Usage: npx ts-node scripts/verify-live-shopping.ts
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Starting Live Shopping Integration Verification...\n');

let errors: string[] = [];
let warnings: string[] = [];
let successCount = 0;

function check(name: string, condition: boolean, errorMsg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    successCount++;
  } else {
    console.log(`❌ [FAIL] ${name}`);
    errors.push(`${name}: ${errorMsg}`);
  }
}

function warn(name: string, condition: boolean, warnMsg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    successCount++;
  } else {
    console.log(`⚠️  [WARN] ${name}`);
    warnings.push(`${name}: ${warnMsg}`);
  }
}

const rootDir = path.join(__dirname, '..');

// ============================================================================
// 1. Verify Schema Files
// ============================================================================
console.log('\n📁 Checking Schema Files...');

check(
  'Schema: schema-live-shopping.ts',
  fs.existsSync(path.join(rootDir, 'drizzle/schema-live-shopping.ts')),
  'drizzle/schema-live-shopping.ts not found'
);

check(
  'Migration: 0001_live_shopping.sql',
  fs.existsSync(path.join(rootDir, 'drizzle/migrations/0001_live_shopping.sql')),
  'drizzle/migrations/0001_live_shopping.sql not found'
);

// ============================================================================
// 2. Verify Service Files
// ============================================================================
console.log('\n📁 Checking Service Files...');

const servicesDir = path.join(rootDir, 'server/services/live-shopping');

check(
  'Service: sessionCartService.ts',
  fs.existsSync(path.join(servicesDir, 'sessionCartService.ts')),
  'sessionCartService.ts not found'
);

check(
  'Service: sessionPricingService.ts',
  fs.existsSync(path.join(servicesDir, 'sessionPricingService.ts')),
  'sessionPricingService.ts not found'
);

check(
  'Service: sessionOrderService.ts',
  fs.existsSync(path.join(servicesDir, 'sessionOrderService.ts')),
  'sessionOrderService.ts not found'
);

check(
  'Service: sessionCreditService.ts',
  fs.existsSync(path.join(servicesDir, 'sessionCreditService.ts')),
  'sessionCreditService.ts not found'
);

// ============================================================================
// 3. Verify Router Files
// ============================================================================
console.log('\n📁 Checking Router Files...');

check(
  'Router: liveShopping.ts (Staff)',
  fs.existsSync(path.join(rootDir, 'server/routers/liveShopping.ts')),
  'server/routers/liveShopping.ts not found'
);

check(
  'Router: vipPortalLiveShopping.ts (Client)',
  fs.existsSync(path.join(rootDir, 'server/routers/vipPortalLiveShopping.ts')),
  'server/routers/vipPortalLiveShopping.ts not found'
);

// ============================================================================
// 4. Verify SSE Infrastructure
// ============================================================================
console.log('\n📁 Checking SSE Infrastructure...');

check(
  'SSE: sessionEventManager.ts',
  fs.existsSync(path.join(rootDir, 'server/lib/sse/sessionEventManager.ts')),
  'server/lib/sse/sessionEventManager.ts not found'
);

check(
  'SSE API: Staff endpoint',
  fs.existsSync(path.join(rootDir, 'src/pages/api/sse/live-shopping/[sessionId].ts')),
  'src/pages/api/sse/live-shopping/[sessionId].ts not found'
);

check(
  'SSE API: VIP endpoint',
  fs.existsSync(path.join(rootDir, 'src/pages/api/sse/vip/live-shopping/[roomCode].ts')),
  'src/pages/api/sse/vip/live-shopping/[roomCode].ts not found'
);

// ============================================================================
// 5. Verify UI Pages
// ============================================================================
console.log('\n📁 Checking UI Pages...');

check(
  'UI: Staff Sessions List',
  fs.existsSync(path.join(rootDir, 'src/pages/live-shopping/index.tsx')),
  'src/pages/live-shopping/index.tsx not found'
);

check(
  'UI: Staff Session Control',
  fs.existsSync(path.join(rootDir, 'src/pages/live-shopping/[sessionId].tsx')),
  'src/pages/live-shopping/[sessionId].tsx not found'
);

check(
  'UI: VIP Session Page',
  fs.existsSync(path.join(rootDir, 'src/pages/vip/live-session/[roomCode].tsx')),
  'src/pages/vip/live-session/[roomCode].tsx not found'
);

// ============================================================================
// 6. Verify Utilities
// ============================================================================
console.log('\n📁 Checking Utilities...');

check(
  'Utility: financialMath.ts',
  fs.existsSync(path.join(rootDir, 'server/utils/financialMath.ts')),
  'server/utils/financialMath.ts not found'
);

check(
  'Feature Flags: features.ts',
  fs.existsSync(path.join(rootDir, 'server/_core/features.ts')),
  'server/_core/features.ts not found'
);

// ============================================================================
// 7. Verify Documentation
// ============================================================================
console.log('\n📁 Checking Documentation...');

check(
  'Docs: LIVE_SHOPPING.md',
  fs.existsSync(path.join(rootDir, 'docs/features/LIVE_SHOPPING.md')),
  'docs/features/LIVE_SHOPPING.md not found'
);

check(
  'Docs: Atomic Roadmap',
  fs.existsSync(path.join(rootDir, 'docs/roadmaps/LIVE_SHOPPING_ATOMIC_ROADMAP.md')),
  'docs/roadmaps/LIVE_SHOPPING_ATOMIC_ROADMAP.md not found'
);

// ============================================================================
// 8. Verify QA Reports
// ============================================================================
console.log('\n📁 Checking QA Reports...');

const qaReportsDir = path.join(rootDir, 'docs/qa-reports');
const expectedQaReports = [
  'PHASE0_QA_REPORT.md',
  'PHASE1_QA_REPORT.md',
  'PHASE2_QA_REPORT.md',
  'PHASE3_QA_REPORT.md',
  'PHASE4_QA_REPORT.md',
];

for (const report of expectedQaReports) {
  warn(
    `QA Report: ${report}`,
    fs.existsSync(path.join(qaReportsDir, report)),
    `${report} not found (may not be required)`
  );
}

// ============================================================================
// 9. Verify Router Registration
// ============================================================================
console.log('\n📁 Checking Router Registration...');

const routersFile = fs.readFileSync(path.join(rootDir, 'server/routers.ts'), 'utf-8');

check(
  'Router Registered: liveShopping',
  routersFile.includes('liveShopping'),
  'liveShopping router not registered in server/routers.ts'
);

check(
  'Router Registered: vipPortalLiveShopping',
  routersFile.includes('vipPortalLiveShopping'),
  'vipPortalLiveShopping router not registered in server/routers.ts'
);

// ============================================================================
// Summary
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));

console.log(`\n✅ Passed: ${successCount}`);
console.log(`❌ Failed: ${errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORS (Must Fix):');
  errors.forEach(e => console.log(`   - ${e}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (Optional):');
  warnings.forEach(w => console.log(`   - ${w}`));
}

console.log('\n' + '='.repeat(60));

if (errors.length === 0) {
  console.log('🎉 VERIFICATION SUCCESSFUL!');
  console.log('Live Shopping feature is structurally complete and ready for deployment.');
  process.exit(0);
} else {
  console.log('⚠️  VERIFICATION FAILED');
  console.log('Please fix the errors above before deployment.');
  process.exit(1);
}
