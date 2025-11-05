#!/usr/bin/env python3
"""
Verify Quality Remediation Roadmap items against current codebase.
Checks which items are already implemented and which are still needed.
"""

import os
import re
from pathlib import Path

TERP_ROOT = Path("/home/ubuntu/TERP")

def check_error_handling():
    """Check if error handling infrastructure exists"""
    results = {
        "error_infrastructure": False,
        "routers_with_try_catch": 0,
        "total_routers": 0,
        "routers_checked": []
    }
    
    # Check for error handling infrastructure
    error_file = TERP_ROOT / "server" / "_core" / "errors.ts"
    results["error_infrastructure"] = error_file.exists()
    
    # Check routers for try-catch blocks
    routers_dir = TERP_ROOT / "server" / "routers"
    if routers_dir.exists():
        for router_file in routers_dir.glob("*.ts"):
            results["total_routers"] += 1
            content = router_file.read_text()
            
            # Check for try-catch blocks
            has_try_catch = "try {" in content and "catch" in content
            if has_try_catch:
                results["routers_with_try_catch"] += 1
            
            results["routers_checked"].append({
                "file": router_file.name,
                "has_try_catch": has_try_catch
            })
    
    return results

def check_database_transactions():
    """Check if real database transactions are implemented"""
    results = {
        "transaction_infrastructure": False,
        "locking_infrastructure": False,
        "uses_transactions": []
    }
    
    # Check for transaction infrastructure
    tx_file = TERP_ROOT / "server" / "_core" / "dbTransaction.ts"
    results["transaction_infrastructure"] = tx_file.exists()
    
    # Check for locking infrastructure
    lock_file = TERP_ROOT / "server" / "_core" / "dbLocking.ts"
    results["locking_infrastructure"] = lock_file.exists()
    
    # Check if routers use transactions
    routers_dir = TERP_ROOT / "server" / "routers"
    if routers_dir.exists():
        for router_file in routers_dir.glob("*.ts"):
            content = router_file.read_text()
            if "withTransaction" in content or "db.transaction" in content:
                results["uses_transactions"].append(router_file.name)
    
    return results

def check_structured_logging():
    """Check if structured logging is implemented"""
    results = {
        "logger_exists": False,
        "uses_console_log": 0,
        "uses_logger": 0,
        "files_with_console": []
    }
    
    # Check for logger infrastructure
    logger_file = TERP_ROOT / "server" / "_core" / "logger.ts"
    results["logger_exists"] = logger_file.exists()
    
    # Check server files for console.log vs logger usage
    server_dir = TERP_ROOT / "server"
    if server_dir.exists():
        for ts_file in server_dir.rglob("*.ts"):
            if "node_modules" in str(ts_file):
                continue
                
            content = ts_file.read_text()
            
            # Count console.log usage
            console_matches = len(re.findall(r'console\.(log|error|warn)', content))
            if console_matches > 0:
                results["uses_console_log"] += console_matches
                results["files_with_console"].append({
                    "file": str(ts_file.relative_to(TERP_ROOT)),
                    "count": console_matches
                })
            
            # Count logger usage
            logger_matches = len(re.findall(r'logger\.(info|error|warn|debug)', content))
            results["uses_logger"] += logger_matches
    
    return results

def check_monitoring():
    """Check if monitoring infrastructure exists"""
    results = {
        "health_check": False,
        "connection_pool": False,
        "metrics": False
    }
    
    # Check for health check endpoint
    health_file = TERP_ROOT / "server" / "_core" / "healthCheck.ts"
    results["health_check"] = health_file.exists()
    
    # Check for connection pool
    pool_file = TERP_ROOT / "server" / "_core" / "connectionPool.ts"
    results["connection_pool"] = pool_file.exists()
    
    # Check for metrics/monitoring
    system_router = TERP_ROOT / "server" / "_core" / "systemRouter.ts"
    if system_router.exists():
        content = system_router.read_text()
        results["metrics"] = "metrics" in content or "monitoring" in content
    
    return results

def check_authentication():
    """Check authentication implementation"""
    results = {
        "auth_router": False,
        "jwt_middleware": False,
        "rbac": False
    }
    
    # Check for auth router
    auth_router = TERP_ROOT / "server" / "routers" / "auth.ts"
    results["auth_router"] = auth_router.exists()
    
    # Check for JWT middleware
    middleware_file = TERP_ROOT / "server" / "_core" / "middleware.ts"
    if middleware_file.exists():
        content = middleware_file.read_text()
        results["jwt_middleware"] = "jwt" in content.lower() or "token" in content.lower()
    
    # Check for RBAC
    if auth_router.exists():
        content = auth_router.read_text()
        results["rbac"] = "role" in content.lower() or "permission" in content.lower()
    
    return results

def check_input_validation():
    """Check input validation implementation"""
    results = {
        "uses_zod": 0,
        "total_procedures": 0,
        "validation_percentage": 0
    }
    
    # Check routers for Zod usage
    routers_dir = TERP_ROOT / "server" / "routers"
    if routers_dir.exists():
        for router_file in routers_dir.glob("*.ts"):
            content = router_file.read_text()
            
            # Count procedures
            procedures = len(re.findall(r'\.(query|mutation)\(', content))
            results["total_procedures"] += procedures
            
            # Count Zod schemas
            zod_schemas = len(re.findall(r'z\.(object|string|number|array)', content))
            results["uses_zod"] += zod_schemas
    
    if results["total_procedures"] > 0:
        results["validation_percentage"] = round(
            (results["uses_zod"] / results["total_procedures"]) * 100, 1
        )
    
    return results

def main():
    print("=" * 80)
    print("TERP Quality Remediation Roadmap Verification")
    print("=" * 80)
    print()
    
    # P0.1: Error Handling
    print("P0.1: Comprehensive Error Handling")
    print("-" * 80)
    error_results = check_error_handling()
    print(f"✓ Error infrastructure exists: {error_results['error_infrastructure']}")
    print(f"  Routers with try-catch: {error_results['routers_with_try_catch']}/{error_results['total_routers']}")
    if error_results['routers_with_try_catch'] == error_results['total_routers']:
        print("  STATUS: ✅ COMPLETE")
    elif error_results['routers_with_try_catch'] > 0:
        print("  STATUS: 🟡 PARTIAL")
    else:
        print("  STATUS: ❌ NOT STARTED")
    print()
    
    # P0.2: Database Transactions
    print("P0.2: Real Database Transactions")
    print("-" * 80)
    tx_results = check_database_transactions()
    print(f"✓ Transaction infrastructure: {tx_results['transaction_infrastructure']}")
    print(f"✓ Locking infrastructure: {tx_results['locking_infrastructure']}")
    print(f"  Routers using transactions: {len(tx_results['uses_transactions'])}")
    if tx_results['transaction_infrastructure'] and len(tx_results['uses_transactions']) > 5:
        print("  STATUS: ✅ COMPLETE")
    elif tx_results['transaction_infrastructure']:
        print("  STATUS: 🟡 PARTIAL")
    else:
        print("  STATUS: ❌ NOT STARTED")
    print()
    
    # P0.3: Authentication
    print("P0.3: Secure Authentication & Authorization")
    print("-" * 80)
    auth_results = check_authentication()
    print(f"✓ Auth router exists: {auth_results['auth_router']}")
    print(f"✓ JWT middleware: {auth_results['jwt_middleware']}")
    print(f"✓ RBAC implemented: {auth_results['rbac']}")
    if all(auth_results.values()):
        print("  STATUS: ✅ COMPLETE")
    elif any(auth_results.values()):
        print("  STATUS: 🟡 PARTIAL")
    else:
        print("  STATUS: ❌ NOT STARTED")
    print()
    
    # P0.4: Structured Logging
    print("P0.4: Implement Structured Logging")
    print("-" * 80)
    log_results = check_structured_logging()
    print(f"✓ Logger infrastructure: {log_results['logger_exists']}")
    print(f"  Console.log usage: {log_results['uses_console_log']} instances")
    print(f"  Logger usage: {log_results['uses_logger']} instances")
    if log_results['logger_exists'] and log_results['uses_console_log'] == 0:
        print("  STATUS: ✅ COMPLETE")
    elif log_results['logger_exists']:
        print("  STATUS: 🟡 PARTIAL (console.log still in use)")
    else:
        print("  STATUS: ❌ NOT STARTED")
    print()
    
    # P0.5: Basic Monitoring
    print("P0.5: Add Basic Monitoring")
    print("-" * 80)
    mon_results = check_monitoring()
    print(f"✓ Health check endpoint: {mon_results['health_check']}")
    print(f"✓ Connection pool: {mon_results['connection_pool']}")
    print(f"✓ Metrics/monitoring: {mon_results['metrics']}")
    if all(mon_results.values()):
        print("  STATUS: ✅ COMPLETE")
    elif any(mon_results.values()):
        print("  STATUS: 🟡 PARTIAL")
    else:
        print("  STATUS: ❌ NOT STARTED")
    print()
    
    # Input Validation (part of P0.2)
    print("Input Validation (Zod Schemas)")
    print("-" * 80)
    val_results = check_input_validation()
    print(f"  Total procedures: {val_results['total_procedures']}")
    print(f"  Zod schemas: {val_results['uses_zod']}")
    print(f"  Validation coverage: {val_results['validation_percentage']}%")
    if val_results['validation_percentage'] >= 80:
        print("  STATUS: ✅ COMPLETE")
    elif val_results['validation_percentage'] >= 50:
        print("  STATUS: 🟡 PARTIAL")
    else:
        print("  STATUS: ❌ NEEDS WORK")
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    statuses = []
    statuses.append(("P0.1 Error Handling", 
                     "✅" if error_results['routers_with_try_catch'] == error_results['total_routers'] 
                     else "🟡" if error_results['routers_with_try_catch'] > 0 
                     else "❌"))
    statuses.append(("P0.2 Transactions", 
                     "✅" if tx_results['transaction_infrastructure'] and len(tx_results['uses_transactions']) > 5
                     else "🟡" if tx_results['transaction_infrastructure']
                     else "❌"))
    statuses.append(("P0.3 Authentication", 
                     "✅" if all(auth_results.values())
                     else "🟡" if any(auth_results.values())
                     else "❌"))
    statuses.append(("P0.4 Logging", 
                     "✅" if log_results['logger_exists'] and log_results['uses_console_log'] == 0
                     else "🟡" if log_results['logger_exists']
                     else "❌"))
    statuses.append(("P0.5 Monitoring", 
                     "✅" if all(mon_results.values())
                     else "🟡" if any(mon_results.values())
                     else "❌"))
    
    for name, status in statuses:
        print(f"{status} {name}")
    
    complete = sum(1 for _, s in statuses if s == "✅")
    partial = sum(1 for _, s in statuses if s == "🟡")
    not_started = sum(1 for _, s in statuses if s == "❌")
    
    print()
    print(f"Complete: {complete}/5")
    print(f"Partial: {partial}/5")
    print(f"Not Started: {not_started}/5")
    print()
    
    overall_percentage = ((complete * 100) + (partial * 50)) / 500
    print(f"Overall P0 Completion: {overall_percentage:.1f}%")
    print("=" * 80)

if __name__ == "__main__":
    main()
