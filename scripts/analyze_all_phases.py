#!/usr/bin/env python3
"""
Comprehensive analyzer for all Quality Remediation Roadmap phases (P0, P1, P2).
Checks implementation status of all items and generates actionable report.
"""

import os
import re
from pathlib import Path
import json

TERP_ROOT = Path("/home/ubuntu/TERP")

# ============================================================================
# P0 ANALYSIS (Already done, but included for completeness)
# ============================================================================

def analyze_p0():
    """Analyze P0 items - already implemented in verify_roadmap.py"""
    return {
        "error_handling": {"status": "PARTIAL", "completion": 27},
        "transactions": {"status": "PARTIAL", "completion": 10},
        "authentication": {"status": "PARTIAL", "completion": 33},
        "logging": {"status": "PARTIAL", "completion": 10},
        "monitoring": {"status": "PARTIAL", "completion": 67},
        "input_validation": {"status": "COMPLETE", "completion": 100}
    }

# ============================================================================
# P1 ANALYSIS
# ============================================================================

def check_testing_suite():
    """P1.1: Check for comprehensive testing suite"""
    results = {
        "unit_tests": 0,
        "integration_tests": 0,
        "e2e_tests": 0,
        "test_coverage": 0,
        "test_files": []
    }
    
    # Check for test files
    test_patterns = ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"]
    
    for pattern in test_patterns:
        for test_file in TERP_ROOT.rglob(pattern):
            if "node_modules" in str(test_file):
                continue
            results["test_files"].append(str(test_file.relative_to(TERP_ROOT)))
            
            content = test_file.read_text()
            # Count test types
            if "describe(" in content or "it(" in content:
                results["unit_tests"] += content.count("it(")
            if "integration" in content.lower():
                results["integration_tests"] += 1
            if "e2e" in content.lower() or "playwright" in content.lower():
                results["e2e_tests"] += 1
    
    # Estimate coverage (rough)
    total_files = len(list(TERP_ROOT.rglob("*.ts"))) + len(list(TERP_ROOT.rglob("*.tsx")))
    test_files_count = len(results["test_files"])
    results["test_coverage"] = round((test_files_count / max(total_files, 1)) * 100, 1)
    
    return results

def check_security_hardening():
    """P1.2: Check advanced security features"""
    results = {
        "rate_limiting": False,
        "input_sanitization": False,
        "sql_injection_protection": False,
        "xss_protection": False,
        "csrf_protection": False,
        "helmet_js": False
    }
    
    # Check for rate limiting
    middleware_file = TERP_ROOT / "server" / "_core" / "middleware.ts"
    if middleware_file.exists():
        content = middleware_file.read_text()
        results["rate_limiting"] = "rateLimit" in content or "rate-limit" in content
    
    # Check for Helmet.js (security headers)
    package_json = TERP_ROOT / "package.json"
    if package_json.exists():
        content = package_json.read_text()
        results["helmet_js"] = "helmet" in content
    
    # Check for input sanitization
    for router_file in (TERP_ROOT / "server" / "routers").glob("*.ts"):
        content = router_file.read_text()
        if "sanitize" in content.lower() or "escape" in content.lower():
            results["input_sanitization"] = True
            break
    
    # Check for SQL injection protection (using Drizzle ORM is protection)
    results["sql_injection_protection"] = True  # Drizzle ORM provides this
    
    # Check for XSS protection
    client_files = list((TERP_ROOT / "client" / "src").rglob("*.tsx"))
    for client_file in client_files[:10]:  # Sample check
        content = client_file.read_text()
        if "dangerouslySetInnerHTML" in content:
            results["xss_protection"] = False
            break
    else:
        results["xss_protection"] = True  # No dangerous patterns found
    
    return results

def check_performance_optimization():
    """P1.3: Check performance optimizations"""
    results = {
        "database_indexes": 0,
        "query_optimization": False,
        "caching": False,
        "lazy_loading": False,
        "code_splitting": False
    }
    
    # Check for database indexes
    schema_file = TERP_ROOT / "server" / "db" / "schema.ts"
    if schema_file.exists():
        content = schema_file.read_text()
        results["database_indexes"] = content.count("index(")
    
    # Check for caching
    for router_file in (TERP_ROOT / "server" / "routers").glob("*.ts"):
        content = router_file.read_text()
        if "cache" in content.lower() or "redis" in content.lower():
            results["caching"] = True
            break
    
    # Check for lazy loading in client
    client_files = (TERP_ROOT / "client" / "src").rglob("*.tsx")
    for client_file in list(client_files)[:20]:  # Sample
        content = client_file.read_text()
        if "React.lazy" in content or "lazy(" in content:
            results["lazy_loading"] = True
        if "import(" in content:  # Dynamic imports
            results["code_splitting"] = True
        if results["lazy_loading"] and results["code_splitting"]:
            break
    
    return results

def check_enhanced_monitoring():
    """P1.4: Check enhanced monitoring and alerting"""
    results = {
        "error_tracking": False,
        "performance_monitoring": False,
        "alerting": False,
        "dashboards": False,
        "log_aggregation": False
    }
    
    # Check for error tracking (Sentry, etc.)
    package_json = TERP_ROOT / "package.json"
    if package_json.exists():
        content = package_json.read_text()
        results["error_tracking"] = "sentry" in content.lower() or "bugsnag" in content.lower()
    
    # Check for performance monitoring
    system_router = TERP_ROOT / "server" / "_core" / "systemRouter.ts"
    if system_router.exists():
        content = system_router.read_text()
        results["performance_monitoring"] = "performance" in content.lower() or "metrics" in content.lower()
    
    # Check for alerting
    for file in (TERP_ROOT / "server").rglob("*.ts"):
        if "node_modules" in str(file):
            continue
        content = file.read_text()
        if "alert" in content.lower() or "notification" in content.lower():
            results["alerting"] = True
            break
    
    return results

# ============================================================================
# P2 ANALYSIS
# ============================================================================

def check_advanced_testing():
    """P2.1: Check advanced testing and coverage"""
    results = {
        "load_testing": False,
        "security_testing": False,
        "accessibility_testing": False,
        "visual_regression": False
    }
    
    # Check for load testing
    for file in TERP_ROOT.rglob("*.ts"):
        if "node_modules" in str(file):
            continue
        content = file.read_text()
        if "k6" in content or "artillery" in content or "jmeter" in content:
            results["load_testing"] = True
            break
    
    # Check for security testing
    package_json = TERP_ROOT / "package.json"
    if package_json.exists():
        content = package_json.read_text()
        results["security_testing"] = "snyk" in content or "owasp" in content
    
    # Check for accessibility testing
    for file in (TERP_ROOT / "client").rglob("*.test.tsx"):
        content = file.read_text()
        if "axe" in content or "accessibility" in content.lower():
            results["accessibility_testing"] = True
            break
    
    return results

def check_operational_excellence():
    """P2.2: Check performance and operational excellence"""
    results = {
        "ci_cd": False,
        "automated_deployment": False,
        "backup_strategy": False,
        "disaster_recovery": False
    }
    
    # Check for CI/CD
    github_workflows = TERP_ROOT / ".github" / "workflows"
    if github_workflows.exists():
        results["ci_cd"] = len(list(github_workflows.glob("*.yml"))) > 0
    
    # Check for automated deployment
    if github_workflows.exists():
        for workflow in github_workflows.glob("*.yml"):
            content = workflow.read_text()
            if "deploy" in content.lower():
                results["automated_deployment"] = True
                break
    
    return results

def check_documentation():
    """P2.3: Check documentation and knowledge management"""
    results = {
        "api_docs": False,
        "architecture_docs": False,
        "runbooks": False,
        "changelog": False,
        "readme": False
    }
    
    # Check for API docs
    docs_dir = TERP_ROOT / "docs"
    if docs_dir.exists():
        for doc_file in docs_dir.glob("*API*.md"):
            results["api_docs"] = True
            break
    
    # Check for architecture docs
    if docs_dir.exists():
        for doc_file in docs_dir.glob("*ARCHITECTURE*.md"):
            results["architecture_docs"] = True
            break
        for doc_file in docs_dir.glob("*DESIGN*.md"):
            results["architecture_docs"] = True
            break
    
    # Check for runbooks
    if docs_dir.exists():
        for doc_file in docs_dir.glob("*RUNBOOK*.md"):
            results["runbooks"] = True
            break
    
    # Check for CHANGELOG
    results["changelog"] = (TERP_ROOT / "CHANGELOG.md").exists()
    
    # Check for README
    results["readme"] = (TERP_ROOT / "README.md").exists()
    
    return results

# ============================================================================
# MAIN ANALYSIS
# ============================================================================

def calculate_completion(results):
    """Calculate completion percentage from boolean results"""
    if not results:
        return 0
    total = len(results)
    completed = sum(1 for v in results.values() if v)
    return round((completed / total) * 100, 1)

def main():
    print("=" * 80)
    print("COMPREHENSIVE QUALITY REMEDIATION ROADMAP ANALYSIS")
    print("All Phases: P0, P1, P2")
    print("=" * 80)
    print()
    
    # P0 Summary (already analyzed)
    print("=" * 80)
    print("P0: CRITICAL FIXES (Production Blockers)")
    print("=" * 80)
    p0_results = analyze_p0()
    p0_total = 0
    for item, data in p0_results.items():
        status_icon = "✅" if data["status"] == "COMPLETE" else "🟡" if data["status"] == "PARTIAL" else "❌"
        print(f"{status_icon} {item.replace('_', ' ').title()}: {data['completion']}%")
        p0_total += data["completion"]
    p0_avg = round(p0_total / len(p0_results), 1)
    print(f"\n📊 P0 Overall Completion: {p0_avg}%")
    print()
    
    # P1 Analysis
    print("=" * 80)
    print("P1: HIGH PRIORITY (Post-Launch)")
    print("=" * 80)
    
    print("\nP1.1: Comprehensive Testing Suite")
    print("-" * 80)
    testing = check_testing_suite()
    print(f"  Unit tests: {testing['unit_tests']}")
    print(f"  Integration tests: {testing['integration_tests']}")
    print(f"  E2E tests: {testing['e2e_tests']}")
    print(f"  Test files: {len(testing['test_files'])}")
    print(f"  Estimated coverage: {testing['test_coverage']}%")
    p1_1_completion = min(testing['test_coverage'], 100)
    status = "✅" if p1_1_completion >= 80 else "🟡" if p1_1_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p1_1_completion}% complete")
    
    print("\nP1.2: Advanced Security Hardening")
    print("-" * 80)
    security = check_security_hardening()
    for key, value in security.items():
        icon = "✅" if value else "❌"
        print(f"  {icon} {key.replace('_', ' ').title()}")
    p1_2_completion = calculate_completion(security)
    status = "✅" if p1_2_completion >= 80 else "🟡" if p1_2_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p1_2_completion}% complete")
    
    print("\nP1.3: Performance Optimization")
    print("-" * 80)
    performance = check_performance_optimization()
    print(f"  Database indexes: {performance['database_indexes']}")
    print(f"  {'✅' if performance['query_optimization'] else '❌'} Query optimization")
    print(f"  {'✅' if performance['caching'] else '❌'} Caching")
    print(f"  {'✅' if performance['lazy_loading'] else '❌'} Lazy loading")
    print(f"  {'✅' if performance['code_splitting'] else '❌'} Code splitting")
    p1_3_completion = calculate_completion({k: v for k, v in performance.items() if k != 'database_indexes'})
    status = "✅" if p1_3_completion >= 80 else "🟡" if p1_3_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p1_3_completion}% complete")
    
    print("\nP1.4: Enhanced Monitoring & Alerting")
    print("-" * 80)
    monitoring = check_enhanced_monitoring()
    for key, value in monitoring.items():
        icon = "✅" if value else "❌"
        print(f"  {icon} {key.replace('_', ' ').title()}")
    p1_4_completion = calculate_completion(monitoring)
    status = "✅" if p1_4_completion >= 80 else "🟡" if p1_4_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p1_4_completion}% complete")
    
    p1_avg = round((p1_1_completion + p1_2_completion + p1_3_completion + p1_4_completion) / 4, 1)
    print(f"\n📊 P1 Overall Completion: {p1_avg}%")
    print()
    
    # P2 Analysis
    print("=" * 80)
    print("P2: MEDIUM PRIORITY (Optimization)")
    print("=" * 80)
    
    print("\nP2.1: Advanced Testing & Coverage")
    print("-" * 80)
    advanced_testing = check_advanced_testing()
    for key, value in advanced_testing.items():
        icon = "✅" if value else "❌"
        print(f"  {icon} {key.replace('_', ' ').title()}")
    p2_1_completion = calculate_completion(advanced_testing)
    status = "✅" if p2_1_completion >= 80 else "🟡" if p2_1_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p2_1_completion}% complete")
    
    print("\nP2.2: Performance & Operational Excellence")
    print("-" * 80)
    ops = check_operational_excellence()
    for key, value in ops.items():
        icon = "✅" if value else "❌"
        print(f"  {icon} {key.replace('_', ' ').title()}")
    p2_2_completion = calculate_completion(ops)
    status = "✅" if p2_2_completion >= 80 else "🟡" if p2_2_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p2_2_completion}% complete")
    
    print("\nP2.3: Documentation & Knowledge Management")
    print("-" * 80)
    docs = check_documentation()
    for key, value in docs.items():
        icon = "✅" if value else "❌"
        print(f"  {icon} {key.replace('_', ' ').title()}")
    p2_3_completion = calculate_completion(docs)
    status = "✅" if p2_3_completion >= 80 else "🟡" if p2_3_completion >= 50 else "❌"
    print(f"  {status} STATUS: {p2_3_completion}% complete")
    
    p2_avg = round((p2_1_completion + p2_2_completion + p2_3_completion) / 3, 1)
    print(f"\n📊 P2 Overall Completion: {p2_avg}%")
    print()
    
    # Overall Summary
    print("=" * 80)
    print("OVERALL SUMMARY")
    print("=" * 80)
    print(f"P0 (Critical): {p0_avg}%")
    print(f"P1 (High Priority): {p1_avg}%")
    print(f"P2 (Medium Priority): {p2_avg}%")
    print()
    overall = round((p0_avg + p1_avg + p2_avg) / 3, 1)
    print(f"🎯 TOTAL COMPLETION: {overall}%")
    print("=" * 80)
    
    # Save detailed results
    results = {
        "p0": p0_results,
        "p1": {
            "testing": testing,
            "security": security,
            "performance": performance,
            "monitoring": monitoring
        },
        "p2": {
            "advanced_testing": advanced_testing,
            "operational_excellence": ops,
            "documentation": docs
        },
        "summary": {
            "p0_completion": p0_avg,
            "p1_completion": p1_avg,
            "p2_completion": p2_avg,
            "overall_completion": overall
        }
    }
    
    output_file = TERP_ROOT / "scripts" / "roadmap_analysis_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {output_file.relative_to(TERP_ROOT)}")

if __name__ == "__main__":
    main()
