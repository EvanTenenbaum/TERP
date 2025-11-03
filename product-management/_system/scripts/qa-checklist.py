#!/usr/bin/env python3
"""
QA Checklist Automation for TERP Product Management

Runs automated quality checks on initiatives before completion.
"""

import json
import sys
import os
import subprocess
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
INITIATIVES_DIR = BASE_DIR / "initiatives"

def run_command(cmd, cwd=None):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def check_code_quality(init_dir, report):
    """Check code quality with linting"""
    print("🔍 Checking code quality...")
    
    # Find all TypeScript/JavaScript files in artifacts
    artifacts_dir = init_dir / "artifacts"
    if not artifacts_dir.exists():
        report["code_quality"] = {"status": "skipped", "reason": "No artifacts directory"}
        return True
    
    ts_files = list(artifacts_dir.glob("**/*.ts")) + list(artifacts_dir.glob("**/*.tsx"))
    js_files = list(artifacts_dir.glob("**/*.js")) + list(artifacts_dir.glob("**/*.jsx"))
    
    if not ts_files and not js_files:
        report["code_quality"] = {"status": "skipped", "reason": "No code files found"}
        return True
    
    issues = []
    
    # Check for console.log statements
    for file in ts_files + js_files:
        with open(file, 'r') as f:
            content = f.read()
            if 'console.log' in content:
                issues.append(f"Found console.log in {file.name}")
    
    # Check for TODO/FIXME comments
    for file in ts_files + js_files:
        with open(file, 'r') as f:
            for i, line in enumerate(f, 1):
                if 'TODO' in line or 'FIXME' in line:
                    issues.append(f"Found TODO/FIXME in {file.name}:{i}")
    
    report["code_quality"] = {
        "status": "pass" if not issues else "warning",
        "files_checked": len(ts_files) + len(js_files),
        "issues": issues
    }
    
    if issues:
        print(f"⚠️  Found {len(issues)} code quality issue(s)")
        for issue in issues[:5]:  # Show first 5
            print(f"   - {issue}")
    else:
        print("✅ Code quality checks passed")
    
    return True

def check_type_safety(init_dir, report):
    """Check TypeScript type safety"""
    print("🔍 Checking type safety...")
    
    artifacts_dir = init_dir / "artifacts"
    if not artifacts_dir.exists():
        report["type_safety"] = {"status": "skipped", "reason": "No artifacts directory"}
        return True
    
    ts_files = list(artifacts_dir.glob("**/*.ts")) + list(artifacts_dir.glob("**/*.tsx"))
    
    if not ts_files:
        report["type_safety"] = {"status": "skipped", "reason": "No TypeScript files"}
        return True
    
    # Count 'any' types
    any_count = 0
    total_lines = 0
    
    for file in ts_files:
        with open(file, 'r') as f:
            lines = f.readlines()
            total_lines += len(lines)
            for line in lines:
                if ': any' in line or '<any>' in line:
                    any_count += 1
    
    any_ratio = (any_count / max(total_lines, 1)) * 100
    
    report["type_safety"] = {
        "status": "pass" if any_ratio < 5 else "warning",
        "any_count": any_count,
        "any_ratio": f"{any_ratio:.1f}%",
        "total_lines": total_lines
    }
    
    if any_ratio >= 5:
        print(f"⚠️  High usage of 'any' type: {any_ratio:.1f}%")
    else:
        print("✅ Type safety checks passed")
    
    return True

def check_error_handling(init_dir, report):
    """Check for proper error handling"""
    print("🔍 Checking error handling...")
    
    artifacts_dir = init_dir / "artifacts"
    if not artifacts_dir.exists():
        report["error_handling"] = {"status": "skipped", "reason": "No artifacts directory"}
        return True
    
    ts_files = list(artifacts_dir.glob("**/*.ts")) + list(artifacts_dir.glob("**/*.tsx"))
    
    if not ts_files:
        report["error_handling"] = {"status": "skipped", "reason": "No code files"}
        return True
    
    issues = []
    async_count = 0
    try_catch_count = 0
    
    for file in ts_files:
        with open(file, 'r') as f:
            content = f.read()
            
            # Count async functions
            async_count += content.count('async ')
            
            # Count try-catch blocks
            try_catch_count += content.count('try {')
            
            # Check for unhandled promises
            if 'await ' in content and 'try' not in content:
                issues.append(f"Potential unhandled promise in {file.name}")
    
    coverage = (try_catch_count / max(async_count, 1)) * 100
    
    report["error_handling"] = {
        "status": "pass" if coverage >= 50 or async_count == 0 else "warning",
        "async_functions": async_count,
        "try_catch_blocks": try_catch_count,
        "coverage": f"{coverage:.0f}%",
        "issues": issues
    }
    
    if coverage < 50 and async_count > 0:
        print(f"⚠️  Low error handling coverage: {coverage:.0f}%")
    else:
        print("✅ Error handling checks passed")
    
    return True

def check_documentation(init_dir, report):
    """Check for documentation"""
    print("🔍 Checking documentation...")
    
    docs_dir = init_dir / "docs"
    overview_file = init_dir / "overview.md"
    
    has_overview = overview_file.exists()
    has_docs = docs_dir.exists() and any(docs_dir.iterdir())
    
    artifacts_dir = init_dir / "artifacts"
    has_artifacts = artifacts_dir.exists() and any(artifacts_dir.iterdir())
    
    status = "pass"
    issues = []
    
    if not has_overview:
        issues.append("Missing overview.md")
        status = "fail"
    
    if has_artifacts and not has_docs:
        issues.append("No documentation for code artifacts")
        status = "warning"
    
    report["documentation"] = {
        "status": status,
        "has_overview": has_overview,
        "has_docs": has_docs,
        "issues": issues
    }
    
    if issues:
        print(f"⚠️  Documentation issues: {', '.join(issues)}")
    else:
        print("✅ Documentation checks passed")
    
    return status != "fail"

def generate_qa_report(init_id, report):
    """Generate QA report"""
    init_dir = INITIATIVES_DIR / init_id
    report_file = init_dir / "qa-report.md"
    
    with open(report_file, 'w') as f:
        f.write(f"# QA Report: {init_id}\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Generated By**: QA Checklist Automation\n\n")
        f.write("---\n\n")
        
        # Overall status
        all_passed = all(
            check.get("status") in ["pass", "skipped"] 
            for check in report.values()
        )
        
        f.write("## Overall Status\n\n")
        if all_passed:
            f.write("✅ **PASSED** - All QA checks passed\n\n")
        else:
            f.write("❌ **FAILED** - Some QA checks failed or have warnings\n\n")
        
        f.write("---\n\n")
        
        # Individual checks
        for check_name, check_data in report.items():
            status_icon = {
                "pass": "✅",
                "warning": "⚠️",
                "fail": "❌",
                "skipped": "⏭️"
            }.get(check_data.get("status"), "❓")
            
            f.write(f"## {check_name.replace('_', ' ').title()}\n\n")
            f.write(f"**Status**: {status_icon} {check_data.get('status', 'unknown').upper()}\n\n")
            
            for key, value in check_data.items():
                if key == "status":
                    continue
                if key == "issues" and value:
                    f.write(f"**Issues**:\n")
                    for issue in value:
                        f.write(f"- {issue}\n")
                    f.write("\n")
                else:
                    f.write(f"**{key.replace('_', ' ').title()}**: {value}\n")
            
            f.write("\n---\n\n")
        
        # Recommendations
        f.write("## Recommendations\n\n")
        if all_passed:
            f.write("This initiative meets all QA standards and is ready for completion.\n")
        else:
            f.write("Please address the issues and warnings before marking this initiative as complete.\n")
        f.write("\n")
    
    print(f"\n📄 QA report generated: {report_file}")
    return all_passed

def run_qa(init_id):
    """Run full QA checklist"""
    print(f"\n{'='*80}")
    print(f"Running QA Checklist for {init_id}")
    print(f"{'='*80}\n")
    
    init_dir = INITIATIVES_DIR / init_id
    if not init_dir.exists():
        print(f"❌ Initiative {init_id} not found")
        return False
    
    report = {}
    
    # Run all checks
    checks = [
        ("code_quality", check_code_quality),
        ("type_safety", check_type_safety),
        ("error_handling", check_error_handling),
        ("documentation", check_documentation),
    ]
    
    all_passed = True
    for check_name, check_func in checks:
        success = check_func(init_dir, report)
        if not success:
            all_passed = False
        print()
    
    # Generate report
    report_passed = generate_qa_report(init_id, report)
    
    if report_passed:
        print("\n✅ QA PASSED - Initiative is ready for completion")
    else:
        print("\n❌ QA FAILED - Please address issues before completing")
    
    return report_passed

def main():
    if len(sys.argv) != 2:
        print("Usage: qa-checklist.py INIT-ID")
        sys.exit(1)
    
    init_id = sys.argv[1]
    success = run_qa(init_id)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
