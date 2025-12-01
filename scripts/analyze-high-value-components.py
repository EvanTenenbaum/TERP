#!/usr/bin/env python3
"""
Targeted analysis of high-value components for React.memo
Focuses on list items, cards, rows, and widgets
"""

import os
import json
from pathlib import Path
from google import genai

# High-value component patterns
HIGH_VALUE_COMPONENTS = [
    "client/src/components/comments/CommentItem.tsx",
    "client/src/components/comments/CommentList.tsx",
    "client/src/components/inbox/InboxItem.tsx",
    "client/src/components/orders/LineItemRow.tsx",
    "client/src/components/orders/OrderItemCard.tsx",
    "client/src/components/todos/TaskCard.tsx",
    "client/src/components/todos/TodoListCard.tsx",
    "client/src/components/workflow/WorkflowBatchCard.tsx",
    "client/src/components/data-cards/DataCard.tsx",
    "client/src/components/inventory/InventoryCard.tsx",
    "client/src/components/needs/MatchCard.tsx",
    "client/src/components/dashboard/KpiSummaryRow.tsx",
    # Dashboard widgets
    "client/src/components/dashboard/widgets-v2/ActivityLogPanel.tsx",
    "client/src/components/dashboard/widgets-v2/CommentsPanel.tsx",
    "client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx",
    "client/src/components/dashboard/widgets-v2/SmartOpportunitiesWidget.tsx",
    "client/src/components/dashboard/widgets-v2/TopStrainFamiliesWidget.tsx",
    "client/src/components/dashboard/widgets-v2/CashFlowWidget.tsx",
    "client/src/components/dashboard/widgets-v2/ProfitabilityWidget.tsx",
    "client/src/components/dashboard/widgets-v2/SalesByClientWidget.tsx",
]

def analyze_component(file_path, client):
    """Quick analysis of a component."""
    
    if not os.path.exists(file_path):
        return None
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip if already memoized
    if 'React.memo' in content or 'memo(' in content:
        print(f"  ⚠️  Already memoized")
        return {"already_memoized": True, "file_path": file_path}
    
    # Check component size and complexity
    lines = len(content.split('\n'))
    has_hooks = any(hook in content for hook in ['useState', 'useEffect', 'useMemo', 'useCallback'])
    has_trpc = 'trpc' in content or 'useQuery' in content
    
    return {
        "file_path": file_path,
        "component_name": Path(file_path).stem,
        "lines": lines,
        "has_hooks": has_hooks,
        "has_trpc": has_trpc,
        "should_memoize": True,
        "already_memoized": False
    }

def main():
    print("="*80)
    print("HIGH-VALUE COMPONENT ANALYSIS FOR REACT.MEMO")
    print("="*80)
    print(f"\nAnalyzing {len(HIGH_VALUE_COMPONENTS)} high-priority components...\n")
    
    results = []
    
    for file_path in HIGH_VALUE_COMPONENTS:
        print(f"Analyzing: {Path(file_path).name}")
        result = analyze_component(file_path, None)
        if result:
            results.append(result)
    
    # Filter out already memoized
    to_memoize = [r for r in results if not r.get('already_memoized')]
    already_memoized = [r for r in results if r.get('already_memoized')]
    
    print(f"\n{'='*80}")
    print(f"RESULTS")
    print(f"{'='*80}")
    print(f"Total analyzed: {len(results)}")
    print(f"Already memoized: {len(already_memoized)}")
    print(f"To memoize: {len(to_memoize)}")
    
    # Save results
    output = {
        "total": len(results),
        "to_memoize": to_memoize,
        "already_memoized": already_memoized
    }
    
    with open("docs/PERF-002-HIGH-VALUE-COMPONENTS.json", 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nComponents to memoize:")
    for comp in to_memoize:
        print(f"  - {comp['component_name']} ({comp['lines']} lines)")
    
    return to_memoize

if __name__ == "__main__":
    components = main()
