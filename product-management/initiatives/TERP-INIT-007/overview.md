# TERP-INIT-007: Codebase Cleanup & Technical Debt Reduction

**Status**: Approved  
**Created**: 2025-11-04  
**Created By**: Initiative Creator Agent

---

## Overview

This initiative addresses the accumulated technical debt within the TERP codebase to improve maintainability, developer experience, and system reliability. The project will systematically remove unused code, consolidate redundant documentation, and eliminate deprecated deployment configurations. Key activities include removing all Vercel-related artifacts, cleaning up 34 root-level markdown files, deleting backup files from production code, and implementing a structured logging system to replace over 77 instances of `console.log`.

## Objectives

- Remove all Vercel configuration files and references from the codebase
- Consolidate root-level documentation from 34 files to 4 essential files (88% reduction)
- Delete all backup and old files from production directories
- Implement structured logging to replace all console.log statements (77 files)
- Audit and remove unused npm dependencies to reduce bundle size by 5-10%
- Improve developer onboarding experience through clearer documentation structure

## Scope

### In Scope
- Deletion of `vercel.json` and all Vercel references in documentation and code
- Moving 26 markdown files from root directory to `docs/archive/`
- Creating consolidated `docs/DEPLOYMENT_GUIDE.md`
- Deletion of 5 identified backup files (`.backup`, `_OLD.tsx`, etc.)
- Implementation of structured logging library (winston or pino)
- Refactoring 77 files to replace console.log with structured logger
- Running `depcheck` to identify unused dependencies
- Removal of verified unused npm packages
- Full testing and validation after each phase

### Out of Scope
- Major architectural changes to the application
- Refactoring of core business logic (matching engine, services)
- Database schema migrations or data model changes
- Implementation of new user-facing features
- Changes to active deployment configurations (railway.json, DigitalOcean)
- Modifications to The Bible (DEVELOPMENT_PROTOCOLS.md) or PM system

## Features Included

This is a technical debt reduction initiative and does not include new features. The focus is on cleanup, consolidation, and quality improvements.

## Dependencies

This initiative is standalone and has no dependencies on other ongoing projects. It is recommended to execute this during a period of low development activity to minimize merge conflicts.

## Success Criteria

- Root directory reduced from 34 markdown files to 4 essential files (88% reduction)
- Zero Vercel configurations or references remaining in codebase
- Zero backup or old files in production directories
- All 77 files with console.log refactored to use structured logging
- 5-10 unused dependencies removed from package.json
- 5-10% reduction in final bundle size
- All 53 existing tests continue to pass
- Zero TypeScript errors after cleanup
- Successful deployment to DigitalOcean without issues
- No production incidents during or after cleanup

## Implementation Notes

- Create backup branch before starting: `backup/pre-cleanup-YYYYMMDD`
- Use conservative, phased approach with extensive testing between phases
- Deploy to staging environment for 24-hour monitoring before production
- Maintain clear rollback plan at all times
- Follow The Bible (DEVELOPMENT_PROTOCOLS.md) protocols strictly
- Coordinate with other developers to avoid merge conflicts
- Execute during low-traffic window for production deployment

---

**Next Steps**: Initiative approved - ready for implementation by Implementation Agent
