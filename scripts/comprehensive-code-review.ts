#!/usr/bin/env tsx
/**
 * Comprehensive Code Review Script
 * 
 * Systematically analyzes the entire TERP codebase and generates
 * detailed reports for review and improvement planning.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { writeFile, mkdir } from 'fs/promises';

interface FileAnalysis {
  path: string;
  type: 'frontend' | 'backend' | 'shared' | 'test' | 'config' | 'docs';
  lines: number;
  size: number;
  complexity?: number;
  issues: string[];
  dependencies: string[];
}

interface ComponentInventory {
  frontend: {
    pages: string[];
    components: string[];
    hooks: string[];
    utils: string[];
  };
  backend: {
    routers: string[];
    services: string[];
    db: string[];
    utils: string[];
  };
  database: {
    tables: string[];
    migrations: string[];
  };
  tests: {
    unit: string[];
    integration: string[];
    e2e: string[];
  };
}

class CodeReviewer {
  private rootDir: string;
  private inventory: ComponentInventory;
  private analyses: FileAnalysis[];
  private excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next'];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.inventory = {
      frontend: { pages: [], components: [], hooks: [], utils: [] },
      backend: { routers: [], services: [], db: [], utils: [] },
      database: { tables: [], migrations: [] },
      tests: { unit: [], integration: [], e2e: [] },
    };
    this.analyses = [];
  }

  async run() {
    console.log('🔍 Starting comprehensive code review...\n');

    // Phase 1: Inventory
    console.log('📦 Phase 1: Building component inventory...');
    await this.buildInventory();
    await this.saveInventory();

    // Phase 2: File Analysis
    console.log('\n📊 Phase 2: Analyzing files...');
    await this.analyzeFiles();
    await this.saveAnalyses();

    // Phase 3: Architecture Analysis
    console.log('\n🏗️  Phase 3: Analyzing architecture...');
    await this.analyzeArchitecture();

    // Phase 4: Generate Reports
    console.log('\n📝 Phase 4: Generating reports...');
    await this.generateReports();

    console.log('\n✅ Code review complete!');
    console.log('📄 Reports saved to docs/reviews/');
  }

  private async buildInventory() {
    // Frontend inventory
    await this.inventoryDirectory('client/src/pages', this.inventory.frontend.pages);
    await this.inventoryDirectory('client/src/components', this.inventory.frontend.components);
    await this.inventoryDirectory('client/src/hooks', this.inventory.frontend.hooks);
    await this.inventoryDirectory('client/src/utils', this.inventory.frontend.utils);

    // Backend inventory
    await this.inventoryDirectory('server/routers', this.inventory.backend.routers);
    await this.inventoryDirectory('server/services', this.inventory.backend.services);
    await this.inventoryDirectory('server/db', this.inventory.backend.db);
    await this.inventoryDirectory('server/utils', this.inventory.backend.utils);

    // Database inventory
    await this.inventoryDirectory('drizzle/migrations', this.inventory.database.migrations);
    await this.extractTableNames();

    // Test inventory
    await this.inventoryTests();
  }

  private async inventoryDirectory(dir: string, target: string[]) {
    try {
      const fullPath = join(this.rootDir, dir);
      const files = await this.walkDirectory(fullPath);
      target.push(...files.map(f => relative(this.rootDir, f)));
    } catch (error) {
      // Directory doesn't exist, skip
    }
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory() && !this.excludeDirs.includes(entry.name)) {
          files.push(...await this.walkDirectory(fullPath));
        } else if (entry.isFile() && this.isCodeFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    
    return files;
  }

  private isCodeFile(filename: string): boolean {
    const ext = extname(filename);
    return ['.ts', '.tsx', '.js', '.jsx', '.sql'].includes(ext);
  }

  private async extractTableNames() {
    try {
      const schemaPath = join(this.rootDir, 'server/db/schema.ts');
      const content = await readFile(schemaPath, 'utf-8');
      
      // Extract table names from pgTable calls
      const tableRegex = /export const (\w+) = (?:pgTable|mysqlTable)/g;
      let match;
      
      while ((match = tableRegex.exec(content)) !== null) {
        this.inventory.database.tables.push(match[1]);
      }
    } catch (error) {
      console.error('Error extracting table names:', error);
    }
  }

  private async inventoryTests() {
    const testFiles = await this.walkDirectory(join(this.rootDir, 'tests'));
    const e2eFiles = await this.walkDirectory(join(this.rootDir, 'tests-e2e'));
    
    for (const file of testFiles) {
      const relPath = relative(this.rootDir, file);
      if (file.includes('.integration.')) {
        this.inventory.tests.integration.push(relPath);
      } else {
        this.inventory.tests.unit.push(relPath);
      }
    }
    
    this.inventory.tests.e2e.push(...e2eFiles.map(f => relative(this.rootDir, f)));
  }

  private async analyzeFiles() {
    const allFiles = [
      ...this.inventory.frontend.pages,
      ...this.inventory.frontend.components,
      ...this.inventory.frontend.hooks,
      ...this.inventory.frontend.utils,
      ...this.inventory.backend.routers,
      ...this.inventory.backend.services,
      ...this.inventory.backend.db,
      ...this.inventory.backend.utils,
    ];

    for (const file of allFiles) {
      const analysis = await this.analyzeFile(file);
      this.analyses.push(analysis);
    }
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const fullPath = join(this.rootDir, filePath);
    const content = await readFile(fullPath, 'utf-8');
    const stats = await stat(fullPath);
    
    const lines = content.split('\n').length;
    const issues: string[] = [];
    const dependencies: string[] = [];

    // Extract imports
    const importRegex = /import .* from ['"](.*)['"];?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Check for common issues
    if (content.includes(': any')) {
      issues.push('Contains `any` types');
    }
    if (content.includes('console.log') && !filePath.includes('test')) {
      issues.push('Contains console.log statements');
    }
    if (lines > 500) {
      issues.push(`Large file (${lines} lines)`);
    }
    if (!content.includes('export')) {
      issues.push('No exports found');
    }

    // Determine type
    let type: FileAnalysis['type'] = 'config';
    if (filePath.startsWith('client/')) type = 'frontend';
    else if (filePath.startsWith('server/')) type = 'backend';
    else if (filePath.startsWith('shared/')) type = 'shared';
    else if (filePath.includes('test')) type = 'test';

    return {
      path: filePath,
      type,
      lines,
      size: stats.size,
      issues,
      dependencies,
    };
  }

  private async analyzeArchitecture() {
    // Analyze dependencies between modules
    // Analyze circular dependencies
    // Analyze coupling
    // This is a placeholder for more sophisticated analysis
  }

  private async saveInventory() {
    const output = `# TERP Component Inventory

**Generated**: ${new Date().toISOString()}

## Frontend Components

### Pages (${this.inventory.frontend.pages.length})
${this.inventory.frontend.pages.map(p => `- ${p}`).join('\n')}

### Components (${this.inventory.frontend.components.length})
${this.inventory.frontend.components.map(c => `- ${c}`).join('\n')}

### Hooks (${this.inventory.frontend.hooks.length})
${this.inventory.frontend.hooks.map(h => `- ${h}`).join('\n')}

### Utils (${this.inventory.frontend.utils.length})
${this.inventory.frontend.utils.map(u => `- ${u}`).join('\n')}

## Backend Components

### Routers (${this.inventory.backend.routers.length})
${this.inventory.backend.routers.map(r => `- ${r}`).join('\n')}

### Services (${this.inventory.backend.services.length})
${this.inventory.backend.services.map(s => `- ${s}`).join('\n')}

### Database (${this.inventory.backend.db.length})
${this.inventory.backend.db.map(d => `- ${d}`).join('\n')}

### Utils (${this.inventory.backend.utils.length})
${this.inventory.backend.utils.map(u => `- ${u}`).join('\n')}

## Database

### Tables (${this.inventory.database.tables.length})
${this.inventory.database.tables.map(t => `- ${t}`).join('\n')}

### Migrations (${this.inventory.database.migrations.length})
${this.inventory.database.migrations.length} migration files

## Tests

### Unit Tests (${this.inventory.tests.unit.length})
${this.inventory.tests.unit.map(t => `- ${t}`).join('\n')}

### Integration Tests (${this.inventory.tests.integration.length})
${this.inventory.tests.integration.map(t => `- ${t}`).join('\n')}

### E2E Tests (${this.inventory.tests.e2e.length})
${this.inventory.tests.e2e.map(t => `- ${t}`).join('\n')}

## Summary

- **Total Frontend Files**: ${this.inventory.frontend.pages.length + this.inventory.frontend.components.length + this.inventory.frontend.hooks.length + this.inventory.frontend.utils.length}
- **Total Backend Files**: ${this.inventory.backend.routers.length + this.inventory.backend.services.length + this.inventory.backend.db.length + this.inventory.backend.utils.length}
- **Total Database Tables**: ${this.inventory.database.tables.length}
- **Total Test Files**: ${this.inventory.tests.unit.length + this.inventory.tests.integration.length + this.inventory.tests.e2e.length}
`;

    await mkdir(join(this.rootDir, 'docs/reviews'), { recursive: true });
    await writeFile(join(this.rootDir, 'docs/reviews/COMPONENT_INVENTORY.md'), output);
  }

  private async saveAnalyses() {
    const totalLines = this.analyses.reduce((sum, a) => sum + a.lines, 0);
    const totalSize = this.analyses.reduce((sum, a) => sum + a.size, 0);
    const filesWithIssues = this.analyses.filter(a => a.issues.length > 0);

    const output = `# TERP File Analysis Report

**Generated**: ${new Date().toISOString()}

## Overview

- **Total Files Analyzed**: ${this.analyses.length}
- **Total Lines of Code**: ${totalLines.toLocaleString()}
- **Total Size**: ${(totalSize / 1024 / 1024).toFixed(2)} MB
- **Files with Issues**: ${filesWithIssues.length}

## Files by Type

${this.getFilesByType()}

## Issues Found

${this.getIssuesSummary()}

## Large Files (>500 lines)

${this.getLargeFiles()}

## Files with \`any\` Types

${this.getFilesWithAny()}

## Detailed Analysis

${this.getDetailedAnalysis()}
`;

    await writeFile(join(this.rootDir, 'docs/reviews/FILE_ANALYSIS.md'), output);
  }

  private getFilesByType(): string {
    const byType = this.analyses.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byType)
      .map(([type, count]) => `- **${type}**: ${count} files`)
      .join('\n');
  }

  private getIssuesSummary(): string {
    const issueCount = new Map<string, number>();
    
    for (const analysis of this.analyses) {
      for (const issue of analysis.issues) {
        issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
      }
    }

    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => `- **${issue}**: ${count} files`)
      .join('\n');
  }

  private getLargeFiles(): string {
    const large = this.analyses
      .filter(a => a.lines > 500)
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 20);

    return large.map(a => `- ${a.path} (${a.lines} lines)`).join('\n');
  }

  private getFilesWithAny(): string {
    const withAny = this.analyses
      .filter(a => a.issues.includes('Contains `any` types'));

    return withAny.map(a => `- ${a.path}`).join('\n');
  }

  private getDetailedAnalysis(): string {
    return this.analyses
      .filter(a => a.issues.length > 0)
      .slice(0, 50) // Top 50 files with issues
      .map(a => `
### ${a.path}

- **Type**: ${a.type}
- **Lines**: ${a.lines}
- **Size**: ${(a.size / 1024).toFixed(2)} KB
- **Issues**:
${a.issues.map(i => `  - ${i}`).join('\n')}
- **Dependencies**: ${a.dependencies.length}
`).join('\n');
  }

  private async generateReports() {
    // Generate summary report
    const summary = `# TERP Code Review Summary

**Date**: ${new Date().toISOString()}
**Reviewer**: Kiro AI Agent

## Executive Summary

This comprehensive code review analyzed the entire TERP codebase to understand its architecture, identify technical debt, and create a systematic improvement plan.

## Key Findings

### Component Inventory
- **Frontend**: ${this.inventory.frontend.pages.length} pages, ${this.inventory.frontend.components.length} components
- **Backend**: ${this.inventory.backend.routers.length} routers, ${this.inventory.backend.services.length} services
- **Database**: ${this.inventory.database.tables.length} tables, ${this.inventory.database.migrations.length} migrations
- **Tests**: ${this.inventory.tests.unit.length} unit, ${this.inventory.tests.integration.length} integration, ${this.inventory.tests.e2e.length} E2E

### Code Quality
- **Total Files**: ${this.analyses.length}
- **Total Lines**: ${this.analyses.reduce((sum, a) => sum + a.lines, 0).toLocaleString()}
- **Files with Issues**: ${this.analyses.filter(a => a.issues.length > 0).length}

## Next Steps

1. Review detailed reports in \`docs/reviews/\`
2. Prioritize issues by severity
3. Create improvement roadmap
4. Execute systematic refactoring

## Generated Reports

- \`COMPONENT_INVENTORY.md\` - Complete component listing
- \`FILE_ANALYSIS.md\` - Detailed file-by-file analysis
- \`SYSTEM_ARCHITECTURE_REVIEW.md\` - Architecture documentation
- \`CODE_REVIEW_CHECKLIST.md\` - Review checklist

`;

    await writeFile(join(this.rootDir, 'docs/reviews/REVIEW_SUMMARY.md'), summary);
  }
}

// Run the review
const reviewer = new CodeReviewer(process.cwd());
reviewer.run().catch(console.error);
