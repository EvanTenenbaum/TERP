#!/usr/bin/env python3
"""
Cleanup Deprecated Roadmap Files
=================================

This script identifies and archives all deprecated roadmap documentation files,
keeping only the current active roadmap system:
- docs/roadmaps/MASTER_ROADMAP.md
- docs/roadmaps/TESTING_ROADMAP.md
- docs/roadmaps/testing_roadmap_diagram.png

All deprecated files are moved to docs/archive/2025-11/deprecated-roadmaps/
with a comprehensive README explaining the cleanup.

Author: Generated for TERP Cleanup Initiative
Date: 2025-11-29
"""

import argparse
import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RoadmapCleanup:
    """Handles cleanup of deprecated roadmap files"""
    
    def __init__(self, repo_root: Path, dry_run: bool = False):
        self.repo_root = repo_root
        self.dry_run = dry_run
        self.operations: List[Dict] = []
        
        # Define archive directories
        self.archive_base = repo_root / "docs" / "archive" / "2025-11"
        self.deprecated_roadmaps_dir = self.archive_base / "deprecated-roadmaps"
        self.roadmap_backups_dir = self.archive_base / "roadmap-backups"
        
        # Files to keep (active system)
        self.keep_files = {
            "docs/roadmaps/MASTER_ROADMAP.md",
            "docs/roadmaps/TESTING_ROADMAP.md",
            "docs/roadmaps/testing_roadmap_diagram.png",
        }
        
        # Directories to skip entirely
        self.skip_dirs = {
            "docs/archive",
            "product-management",
            "scripts",
            ".git",
            "node_modules",
        }
    
    def is_roadmap_file(self, path: Path) -> bool:
        """Check if a file is roadmap-related"""
        name_lower = path.name.lower()
        return 'roadmap' in name_lower
    
    def should_keep(self, path: Path) -> bool:
        """Check if a file should be kept (not archived)"""
        rel_path = path.relative_to(self.repo_root)
        rel_path_str = str(rel_path)
        
        # Keep active roadmap files
        if rel_path_str in self.keep_files:
            return True
        
        # Keep files in skip directories
        for skip_dir in self.skip_dirs:
            if rel_path_str.startswith(skip_dir):
                return True
        
        # Keep script files (tooling)
        if path.suffix in ['.ts', '.js', '.cjs'] and 'scripts' in path.parts:
            return True
        
        return False
    
    def categorize_file(self, path: Path) -> str:
        """Categorize a roadmap file for archiving"""
        rel_path = str(path.relative_to(self.repo_root))
        
        # Backup files
        if 'backup' in path.name.lower():
            return 'backup'
        
        # Root directory files
        if not '/' in rel_path or rel_path.startswith('./'):
            return 'root'
        
        # Docs directory files (but not in roadmaps or archive)
        if rel_path.startswith('docs/') and not rel_path.startswith('docs/roadmaps/'):
            return 'docs'
        
        # Cursor rules
        if '.cursor' in path.parts:
            return 'cursor'
        
        return 'other'
    
    def find_roadmap_files(self) -> List[Path]:
        """Find all roadmap files in the repository"""
        roadmap_files = []
        
        for path in self.repo_root.rglob('*'):
            if not path.is_file():
                continue
            
            # Skip files in directories we want to keep
            if self.should_keep(path):
                continue
            
            # Check if it's a roadmap file
            if self.is_roadmap_file(path):
                roadmap_files.append(path)
        
        return roadmap_files
    
    def create_archive_directories(self):
        """Create necessary archive directories"""
        dirs_to_create = [
            self.deprecated_roadmaps_dir,
            self.roadmap_backups_dir,
        ]
        
        for directory in dirs_to_create:
            if self.dry_run:
                logger.info(f"[DRY RUN] Would create directory: {directory}")
            else:
                directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created directory: {directory}")
    
    def move_file(self, source: Path, category: str) -> Tuple[Path, Path]:
        """Move a file to appropriate archive location"""
        # Determine destination directory
        if category == 'backup':
            dest_dir = self.roadmap_backups_dir
        else:
            dest_dir = self.deprecated_roadmaps_dir / category
        
        # Create subdirectory if needed
        if not self.dry_run:
            dest_dir.mkdir(parents=True, exist_ok=True)
        
        # Determine destination path
        dest_path = dest_dir / source.name
        
        # Handle name conflicts
        counter = 1
        while dest_path.exists() and not self.dry_run:
            stem = source.stem
            suffix = source.suffix
            dest_path = dest_dir / f"{stem}_{counter}{suffix}"
            counter += 1
        
        # Perform the move
        if self.dry_run:
            logger.info(f"[DRY RUN] Would move: {source} -> {dest_path}")
        else:
            shutil.move(str(source), str(dest_path))
            logger.info(f"Moved: {source} -> {dest_path}")
        
        return source, dest_path
    
    def create_archive_readme(self):
        """Create comprehensive README in archive directory"""
        readme_content = f"""# Deprecated Roadmap Files Archive

**Archive Date:** {datetime.now().strftime('%Y-%m-%d')}  
**Cleanup Initiative:** Roadmap System Consolidation

---

## Purpose

This archive contains all deprecated roadmap documentation files that were removed from the main TERP repository to prevent confusion and maintain a single source of truth for project planning.

## What Was Archived

This cleanup operation archived **{len(self.operations)} files** related to old or deprecated roadmap systems, including:

- **Root Directory Files:** Status reports, consolidated roadmaps, and ad-hoc roadmap documents
- **Docs Directory Files:** Multiple versions of roadmap system documentation (V2, V3, V3.1, V3.2)
- **Backup Files:** Old backups of MASTER_ROADMAP.md
- **QA and Analysis Files:** Roadmap audits, reviews, and system design documents

## Current Active Roadmap System

As of November 2025, the TERP project uses a **unified roadmap system** consisting of:

### Active Files

1. **`docs/roadmaps/MASTER_ROADMAP.md`** - Single source of truth for all development tasks
   - Tracks features, bugs, security fixes, and infrastructure changes
   - Includes test status for each task
   - Updated continuously as work progresses

2. **`docs/roadmaps/TESTING_ROADMAP.md`** - Dedicated testing task tracker
   - Links to features in MASTER_ROADMAP
   - Tracks unit, integration, and E2E tests
   - Ensures comprehensive test coverage

3. **`docs/roadmaps/testing_roadmap_diagram.png`** - Visual representation of testing system

### Current Workflow

The current development workflow is documented in:
- **`docs/CLAUDE_WORKFLOW.md`** - Complete workflow guide (read this first)
- **`docs/QUICK_REFERENCE.md`** - 1-page summary for quick reference
- **`docs/NEW_AGENT_PROMPT.md`** - Mandatory prompt for all new agents

### Key Commands

```bash
# Start working on a planned task
pnpm start-task "TASK-ID"

# Start an ad-hoc task
pnpm start-task --adhoc "Description" --category bug

# Run live QA
live qa
```

## Why These Files Were Archived

The TERP project went through several iterations of roadmap systems between October and November 2025:

1. **Early System (Oct-Nov):** Multiple roadmap files in root directory, feature-specific roadmaps
2. **V2 System (Mid-Nov):** Improved roadmap structure with GitHub integration
3. **V3 System (Late-Nov):** GitHub-native roadmap with testing integration
4. **Current System (Nov 19+):** Simplified, unified MASTER_ROADMAP + TESTING_ROADMAP

Each iteration improved upon the previous one, but left behind documentation files that could cause confusion. This cleanup consolidates all historical roadmap documentation into this archive while preserving the current, active system.

## What Was NOT Archived

The following were intentionally kept in their original locations:

- **Product Management Initiatives** (`product-management/initiatives/`) - Separate initiative system for large projects
- **Script Files** (`scripts/roadmap*.ts`) - Tooling for roadmap management
- **Existing Archives** (`docs/archive/`) - Already archived materials
- **Active Roadmap Files** (listed above)

## File Organization

```
docs/archive/2025-11/
├── deprecated-roadmaps/
│   ├── root/          # Files from repository root
│   ├── docs/          # Files from docs/ directory
│   ├── cursor/        # Cursor IDE rules
│   └── other/         # Miscellaneous roadmap files
└── roadmap-backups/   # Old MASTER_ROADMAP backups
```

## Historical Context

### Timeline of Roadmap System Evolution

- **Nov 4, 2025:** TERP-INIT-008 (Codebase Cleanup) initiative created
- **Nov 12, 2025:** DEVELOPMENT_PROTOCOLS.md deprecated in favor of new workflow
- **Nov 19, 2025:** CLAUDE_WORKFLOW.md v2.0 released with unified roadmap system
- **Nov 30, 2025:** This cleanup performed to remove deprecated roadmap files

### Key Lessons Learned

1. **Single Source of Truth:** Multiple roadmap files create confusion
2. **Test-First Development:** Testing roadmap ensures quality
3. **Clear Workflow:** Documented processes prevent drift
4. **Regular Cleanup:** Archiving deprecated files maintains clarity

## Accessing Archived Files

All files in this archive are preserved for historical reference. If you need to access specific information from an archived roadmap file:

1. Check if the information exists in the current MASTER_ROADMAP.md
2. If not, browse this archive by category
3. For questions about archived content, consult the project maintainers

## Questions?

For questions about the current roadmap system, see:
- `docs/CLAUDE_WORKFLOW.md` - Complete workflow documentation
- `docs/QUICK_REFERENCE.md` - Quick reference guide
- `docs/roadmaps/MASTER_ROADMAP.md` - Current active roadmap

---

**Archive Maintained By:** TERP Development Team  
**Last Updated:** {datetime.now().strftime('%Y-%m-%d')}
"""
        
        readme_path = self.deprecated_roadmaps_dir / "README.md"
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would create README: {readme_path}")
        else:
            with open(readme_path, 'w') as f:
                f.write(readme_content)
            logger.info(f"Created README: {readme_path}")
    
    def generate_report(self) -> Dict:
        """Generate comprehensive cleanup report"""
        report = {
            "cleanup_date": datetime.now().isoformat(),
            "dry_run": self.dry_run,
            "total_files_moved": len(self.operations),
            "operations": self.operations,
            "active_roadmap_files": list(self.keep_files),
            "archive_locations": {
                "deprecated_roadmaps": str(self.deprecated_roadmaps_dir),
                "roadmap_backups": str(self.roadmap_backups_dir),
            },
            "categories": {},
        }
        
        # Count by category
        for op in self.operations:
            category = op['category']
            report['categories'][category] = report['categories'].get(category, 0) + 1
        
        return report
    
    def run(self):
        """Execute the cleanup operation"""
        logger.info("=" * 70)
        logger.info("TERP Roadmap Cleanup Script")
        logger.info("=" * 70)
        logger.info(f"Repository: {self.repo_root}")
        logger.info(f"Dry Run: {self.dry_run}")
        logger.info("")
        
        # Create archive directories
        logger.info("Creating archive directories...")
        self.create_archive_directories()
        logger.info("")
        
        # Find roadmap files
        logger.info("Finding roadmap files to archive...")
        roadmap_files = self.find_roadmap_files()
        logger.info(f"Found {len(roadmap_files)} files to process")
        logger.info("")
        
        # Move files
        logger.info("Moving files to archive...")
        for file_path in roadmap_files:
            category = self.categorize_file(file_path)
            source, dest = self.move_file(file_path, category)
            
            self.operations.append({
                "source": str(source.relative_to(self.repo_root)),
                "destination": str(dest.relative_to(self.repo_root)),
                "category": category,
                "size_bytes": source.stat().st_size if source.exists() else 0,
            })
        
        logger.info("")
        
        # Create README
        logger.info("Creating archive README...")
        self.create_archive_readme()
        logger.info("")
        
        # Generate report
        report = self.generate_report()
        report_path = self.repo_root / "roadmap_cleanup_report.json"
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would save report to: {report_path}")
        else:
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            logger.info(f"Saved cleanup report to: {report_path}")
        
        # Print summary
        logger.info("")
        logger.info("=" * 70)
        logger.info("CLEANUP SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total files processed: {len(self.operations)}")
        logger.info("")
        logger.info("Files by category:")
        for category, count in report['categories'].items():
            logger.info(f"  {category}: {count}")
        logger.info("")
        logger.info("Active roadmap files (kept):")
        for keep_file in self.keep_files:
            logger.info(f"  ✓ {keep_file}")
        logger.info("")
        
        if self.dry_run:
            logger.info("🔍 DRY RUN COMPLETE - No files were actually moved")
            logger.info("Run without --dry-run to execute the cleanup")
        else:
            logger.info("✅ CLEANUP COMPLETE")
            logger.info(f"📊 Full report: {report_path}")
        
        logger.info("=" * 70)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Cleanup deprecated roadmap files in TERP repository"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without actually doing it'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    parser.add_argument(
        '--repo-root',
        type=Path,
        default=Path(__file__).parent.parent,
        help='Path to repository root (default: parent of scripts directory)'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Run cleanup
    cleanup = RoadmapCleanup(
        repo_root=args.repo_root,
        dry_run=args.dry_run
    )
    cleanup.run()


if __name__ == "__main__":
    main()
