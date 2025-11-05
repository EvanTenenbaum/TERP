#!/usr/bin/env python3
"""
Identify all operations that need transaction wrapping.
Looks for multi-step database operations that should be atomic.
"""

import re
from pathlib import Path

TERP_ROOT = Path("/home/ubuntu/TERP")

def analyze_router(router_file):
    """Analyze a router file for multi-step operations"""
    content = router_file.read_text()
    
    results = {
        "file": str(router_file.relative_to(TERP_ROOT)),
        "needs_transactions": [],
        "already_has_transactions": False
    }
    
    # Check if already using transactions
    if "withTransaction" in content or "db.transaction" in content:
        results["already_has_transactions"] = True
        return results
    
    # Find all procedures
    procedures = re.findall(r'\.(query|mutation)\s*\(\s*async\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{', content)
    
    # Look for patterns indicating multi-step operations
    patterns = [
        (r'await\s+db\.(insert|update|delete).*?await\s+db\.(insert|update|delete)', 
         "Multiple DB operations"),
        (r'await\s+db\.insert.*?await\s+db\.update', 
         "Insert followed by update"),
        (r'await\s+db\.update.*?await\s+db\.insert', 
         "Update followed by insert"),
        (r'await\s+db\.delete.*?await\s+db\.(insert|update)', 
         "Delete with insert/update"),
        (r'inventory.*?sale', 
         "Inventory + Sale (order processing)"),
        (r'payment.*?invoice', 
         "Payment + Invoice (payment application)"),
        (r'credit.*?ledger', 
         "Credit + Ledger (credit operations)"),
        (r'batch.*?movement', 
         "Batch + Movement (inventory transfer)"),
    ]
    
    for pattern, description in patterns:
        if re.search(pattern, content, re.IGNORECASE | re.DOTALL):
            results["needs_transactions"].append(description)
    
    return results

def main():
    print("=" * 80)
    print("TRANSACTION NEEDS ANALYSIS")
    print("=" * 80)
    print()
    
    routers_dir = TERP_ROOT / "server" / "routers"
    
    needs_tx = []
    has_tx = []
    
    for router_file in sorted(routers_dir.glob("*.ts")):
        result = analyze_router(router_file)
        
        if result["already_has_transactions"]:
            has_tx.append(result["file"])
        elif result["needs_transactions"]:
            needs_tx.append(result)
    
    print("ROUTERS ALREADY USING TRANSACTIONS")
    print("-" * 80)
    if has_tx:
        for file in has_tx:
            print(f"✅ {file}")
    else:
        print("❌ None found")
    print()
    
    print("ROUTERS NEEDING TRANSACTIONS")
    print("-" * 80)
    if needs_tx:
        for result in needs_tx:
            print(f"\n📁 {result['file']}")
            for reason in result['needs_transactions']:
                print(f"   ⚠️  {reason}")
    else:
        print("✅ All routers either have transactions or don't need them")
    print()
    
    print("=" * 80)
    print(f"Summary: {len(needs_tx)} routers need transaction wrapping")
    print("=" * 80)
    
    # Identify specific critical operations
    print("\nCRITICAL OPERATIONS TO WRAP (Manual Review Required)")
    print("=" * 80)
    
    critical_ops = [
        {
            "file": "server/routers/orders.ts",
            "operation": "Order Creation",
            "steps": [
                "1. Deduct inventory from batch",
                "2. Create sale record",
                "3. Calculate and record COGS",
                "4. Create ledger entries"
            ],
            "risk": "HIGH - Data corruption if partial failure"
        },
        {
            "file": "server/routers/accounting.ts",
            "operation": "Payment Application",
            "steps": [
                "1. Create payment record",
                "2. Update invoice status/balance",
                "3. Apply credit if overpayment",
                "4. Create ledger entries"
            ],
            "risk": "HIGH - Financial discrepancies"
        },
        {
            "file": "server/routers/inventory.ts",
            "operation": "Batch Transfer",
            "steps": [
                "1. Deduct from source batch",
                "2. Add to destination batch",
                "3. Create movement log"
            ],
            "risk": "HIGH - Inventory loss/duplication"
        },
        {
            "file": "server/routers/credit.ts",
            "operation": "Credit Adjustment",
            "steps": [
                "1. Update client credit balance",
                "2. Create credit transaction record",
                "3. Create ledger entry"
            ],
            "risk": "MEDIUM - Credit balance mismatch"
        },
        {
            "file": "server/routers/cogs.ts",
            "operation": "COGS Calculation",
            "steps": [
                "1. Calculate COGS for sale",
                "2. Update batch quantities",
                "3. Record COGS entry"
            ],
            "risk": "MEDIUM - Incorrect cost tracking"
        }
    ]
    
    for op in critical_ops:
        print(f"\n🔴 {op['operation']}")
        print(f"   File: {op['file']}")
        print(f"   Risk: {op['risk']}")
        print("   Steps:")
        for step in op['steps']:
            print(f"      {step}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATION: Start with HIGH risk operations first")
    print("=" * 80)

if __name__ == "__main__":
    main()
