#!/usr/bin/env python3
import os
from google import genai

COMPONENTS = [
    "client/src/components/orders/LineItemRow.tsx",
    "client/src/components/orders/OrderItemCard.tsx",
    "client/src/components/todos/TaskCard.tsx",
    "client/src/components/todos/TodoListCard.tsx",
    "client/src/components/workflow/WorkflowBatchCard.tsx",
    "client/src/components/data-cards/DataCard.tsx",
    "client/src/components/inventory/InventoryCard.tsx",
    "client/src/components/needs/MatchCard.tsx",
    "client/src/components/dashboard/KpiSummaryRow.tsx",
    "client/src/components/dashboard/widgets-v2/ActivityLogPanel.tsx",
    "client/src/components/dashboard/widgets-v2/CommentsPanel.tsx",
    "client/src/components/dashboard/widgets-v2/FreeformNoteWidget.tsx",
    "client/src/components/dashboard/widgets-v2/SmartOpportunitiesWidget.tsx",
    "client/src/components/dashboard/widgets-v2/TopStrainFamiliesWidget.tsx",
]

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

for path in COMPONENTS:
    print(f"Processing: {path.split('/')[-1]}")
    with open(path) as f:
        code = f.read()
    
    result = client.models.generate_content(
        model='gemini-2.0-flash-exp',
        contents=f"Add React.memo to this component. Change 'export function X' to 'export const X = memo(function X' and add memo import. Return ONLY code:\n\n{code}",
        config={'temperature': 0}
    ).text
    
    if '```' in result:
        result = result[result.find('```')+3:result.rfind('```')].strip()
        if result.startswith('tsx') or result.startswith('typescript'):
            result = result[result.find('\n')+1:]
    
    if 'memo' in result:
        with open(path, 'w') as f:
            f.write(result)
        print(f"  ✅ Done")
    else:
        print(f"  ❌ Failed")
