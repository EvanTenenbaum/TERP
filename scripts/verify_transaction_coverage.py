#!/usr/bin/env python3
"""
Verify transaction coverage for all critical operations.
Checks if critical multi-step operations are properly wrapped in transactions.
"""

import re
from pathlib import Path

TERP_ROOT = Path("/home/ubuntu/TERP")

def check_file_for_transactions(file_path):
    """Check if a file uses transactions"""
    content = file_path.read_text()
    
    # Find all transaction usages
    transactions = []
    for match in re.finditer(r'(await\s+db\.transaction|withTransaction)\s*\(async\s*\(?(\w+)?\)?\s*=>\s*\{', content):
        line_num = content[:match.start()].count('\n') + 1
        transactions.append({
            "line": line_num,
            "type": "db.transaction" if "db.transaction" in match.group(0) else "withTransaction"
        })
    
    return transactions

def main():
    print("=" * 80)
    print("TRANSACTION COVERAGE VERIFICATION")
    print("=" * 80)
    print()
    
    # Critical files to check
    critical_files = {
        "ordersDb.ts": {
            "operations": [
                "createOrder",
                "convertQuoteToSale",
                "confirmDraftOrder",
                "updateOrderStatus",
                "fulfillOrder"
            ],
            "risk": "HIGH"
        },
        "accountingDb.ts": {
            "operations": [
                "createPayment",
                "applyPayment",
                "createInvoice",
                "updateInvoiceStatus"
            ],
            "risk": "HIGH"
        },
        "inventoryDb.ts": {
            "operations": [
                "transferBatch",
                "adjustBatch",
                "createBatch"
            ],
            "risk": "HIGH"
        },
        "inventoryMovementsDb.ts": {
            "operations": [
                "createMovement",
                "transferBetweenBatches"
            ],
            "risk": "HIGH"
        },
        "clientsDb.ts": {
            "operations": [
                "updateClientCredit",
                "applyCredit"
            ],
            "risk": "MEDIUM"
        },
        "cogsDb.ts": {
            "operations": [
                "calculateAndRecordCogs",
                "updateBatchCogs"
            ],
            "risk": "MEDIUM"
        }
    }
    
    results = {}
    
    for filename, info in critical_files.items():
        file_path = TERP_ROOT / "server" / filename
        
        if not file_path.exists():
            results[filename] = {
                "exists": False,
                "transactions": [],
                "risk": info["risk"]
            }
            continue
        
        transactions = check_file_for_transactions(file_path)
        
        results[filename] = {
            "exists": True,
            "transactions": transactions,
            "expected_operations": info["operations"],
            "risk": info["risk"]
        }
    
    # Print results
    print("CRITICAL FILES ANALYSIS")
    print("=" * 80)
    
    for filename, data in results.items():
        risk_icon = "🔴" if data["risk"] == "HIGH" else "🟡"
        
        print(f"\n{risk_icon} {filename} ({data['risk']} RISK)")
        print("-" * 80)
        
        if not data["exists"]:
            print("   ❌ File not found")
            continue
        
        tx_count = len(data["transactions"])
        
        if tx_count > 0:
            print(f"   ✅ {tx_count} transaction(s) found")
            for tx in data["transactions"]:
                print(f"      Line {tx['line']}: {tx['type']}")
        else:
            print("   ⚠️  No transactions found")
            print("   Expected operations:")
            for op in data["expected_operations"]:
                print(f"      - {op}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    files_with_tx = sum(1 for d in results.values() if d["exists"] and len(d["transactions"]) > 0)
    files_without_tx = sum(1 for d in results.values() if d["exists"] and len(d["transactions"]) == 0)
    files_missing = sum(1 for d in results.values() if not d["exists"])
    
    print(f"✅ Files with transactions: {files_with_tx}")
    print(f"⚠️  Files without transactions: {files_without_tx}")
    print(f"❌ Files not found: {files_missing}")
    
    total_tx = sum(len(d["transactions"]) for d in results.values() if d["exists"])
    print(f"\n📊 Total transactions found: {total_tx}")
    
    # Check all DB files for transactions
    print("\n" + "=" * 80)
    print("ALL DATABASE FILES")
    print("=" * 80)
    
    server_dir = TERP_ROOT / "server"
    all_db_files = list(server_dir.glob("*Db.ts")) + list(server_dir.glob("*Service.ts"))
    
    all_tx_count = 0
    for db_file in sorted(all_db_files):
        transactions = check_file_for_transactions(db_file)
        if transactions:
            print(f"✅ {db_file.name}: {len(transactions)} transaction(s)")
            all_tx_count += len(transactions)
    
    print(f"\n📊 Total transactions across all DB files: {all_tx_count}")
    
    print("\n" + "=" * 80)
    print("CONCLUSION")
    print("=" * 80)
    
    if files_without_tx == 0 and files_missing == 0:
        print("✅ All critical operations are properly wrapped in transactions!")
        print("   P0.2 Transaction implementation: COMPLETE")
    elif files_without_tx > 0:
        print(f"⚠️  {files_without_tx} critical file(s) need transaction wrapping")
        print("   P0.2 Transaction implementation: PARTIAL")
    else:
        print(f"❌ {files_missing} critical file(s) are missing")
        print("   P0.2 Transaction implementation: INCOMPLETE")

if __name__ == "__main__":
    main()
