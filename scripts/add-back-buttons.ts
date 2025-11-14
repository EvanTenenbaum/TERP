/**
 * Script to add BackButton component to pages that need it
 * 
 * This script systematically adds back buttons to pages based on their type:
 * - Settings pages -> back to dashboard
 * - Creator/Editor pages -> back to list view
 * - Detail pages -> back to list view
 * - Accounting pages -> back to accounting dashboard
 */

import * as fs from 'fs';
import * as path from 'path';

interface PageConfig {
  file: string;
  backLabel: string;
  backTo: string;
}

const pagesToUpdate: PageConfig[] = [
  // Settings pages
  { file: 'client/src/pages/CogsSettingsPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/CreditSettingsPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/Settings.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  
  // Creator/Editor pages
  { file: 'client/src/pages/SalesSheetCreatorPage.tsx', backLabel: 'Back to Orders', backTo: '/orders' },
  
  // List/Management pages
  { file: 'client/src/pages/InboxPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/CalendarPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/PricingProfilesPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/PricingRulesPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/NeedsManagementPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/MatchmakingServicePage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/VendorSupplyPage.tsx', backLabel: 'Back to Vendors', backTo: '/vendors' },
  { file: 'client/src/pages/LocationsPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/ReturnsPage.tsx', backLabel: 'Back to Orders', backTo: '/orders' },
  { file: 'client/src/pages/PurchaseOrdersPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/WorkflowQueuePage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/AnalyticsPage.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  
  // Accounting pages
  { file: 'client/src/pages/accounting/AccountingDashboard.tsx', backLabel: 'Back to Dashboard', backTo: '/' },
  { file: 'client/src/pages/accounting/BankAccounts.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/BankTransactions.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/Bills.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/ChartOfAccounts.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/Expenses.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/FiscalPeriods.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/GeneralLedger.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/Invoices.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
  { file: 'client/src/pages/accounting/Payments.tsx', backLabel: 'Back to Accounting', backTo: '/accounting' },
];

function addBackButtonToFile(config: PageConfig): boolean {
  const filePath = path.join(process.cwd(), config.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${config.file}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already has BackButton import
  if (content.includes('BackButton')) {
    console.log(`⏭️  Skipping ${config.file} (already has BackButton)`);
    return false;
  }
  
  // Add import statement
  const importRegex = /import.*from ['"]lucide-react['"];/;
  const importMatch = content.match(importRegex);
  
  if (importMatch) {
    const importStatement = `import { BackButton } from "@/components/common/BackButton";`;
    content = content.replace(
      importMatch[0],
      `${importMatch[0]}\n${importStatement}`
    );
  } else {
    // If no lucide-react import, add after the last import
    const lastImportRegex = /import.*from ['"].*['"];/g;
    const matches = content.match(lastImportRegex);
    if (matches) {
      const lastImport = matches[matches.length - 1];
      const importStatement = `import { BackButton } from "@/components/common/BackButton";`;
      content = content.replace(lastImport, `${lastImport}\n${importStatement}`);
    }
  }
  
  // Find the return statement and add BackButton after the opening div
  // Look for common patterns: <div className="container or <div className="p-
  const containerRegex = /return \(\s*<div className="(container|p-|space-y-|max-w-)/;
  const match = content.match(containerRegex);
  
  if (match) {
    // Find the end of the opening div tag
    const startIndex = content.indexOf(match[0]);
    const divStart = content.indexOf('<div', startIndex);
    const divEnd = content.indexOf('>', divStart);
    
    const backButtonCode = `\n      <BackButton label="${config.backLabel}" to="${config.backTo}" className="mb-4" />`;
    content = content.slice(0, divEnd + 1) + backButtonCode + content.slice(divEnd + 1);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Added BackButton to ${config.file}`);
    return true;
  } else {
    console.log(`⚠️  Could not find suitable location in ${config.file}`);
    return false;
  }
}

function main() {
  console.log('🚀 Adding BackButton components to pages...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (const config of pagesToUpdate) {
    const result = addBackButtonToFile(config);
    if (result === true) {
      successCount++;
    } else if (result === false && fs.existsSync(path.join(process.cwd(), config.file))) {
      const content = fs.readFileSync(path.join(process.cwd(), config.file), 'utf-8');
      if (content.includes('BackButton')) {
        skipCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`   ⚠️  Failed: ${failCount}`);
  console.log(`   📝 Total processed: ${pagesToUpdate.length}`);
}

main();
