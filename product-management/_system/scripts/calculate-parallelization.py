#!/usr/bin/env python3
"""
Calculate Safe Parallelization Limits
Based on overlap analysis, determine how many agents can work safely in parallel
"""

import json
from pathlib import Path
from datetime import datetime

def load_data():
    """Load registry and overlap analysis"""
    registry_path = Path("initiatives/registry.json")
    overlap_path = Path("pm-evaluation/overlap-analysis.json")
    roadmap_path = Path("pm-evaluation/roadmap_order.json")
    
    if not registry_path.exists():
        print("❌ Error: initiatives/registry.json not found")
        return None, None, None
    
    if not overlap_path.exists():
        print("❌ Error: pm-evaluation/overlap-analysis.json not found")
        print("   Run analyze-overlap.py first")
        return None, None, None
    
    with open(registry_path) as f:
        registry = json.load(f)
    
    with open(overlap_path) as f:
        overlap = json.load(f)
    
    roadmap = None
    if roadmap_path.exists():
        with open(roadmap_path) as f:
            roadmap = json.load(f)
    
    return registry, overlap, roadmap

def get_overlap_score(init_a, init_b, overlap_matrix):
    """Get overlap score between two initiatives"""
    key1 = f"{init_a}_{init_b}"
    key2 = f"{init_b}_{init_a}"
    
    if key1 in overlap_matrix:
        return overlap_matrix[key1]['overlap_pct']
    elif key2 in overlap_matrix:
        return overlap_matrix[key2]['overlap_pct']
    else:
        return 0.0

def can_run_parallel(init_a, init_b, overlap_matrix, threshold=0.3):
    """Check if two initiatives can run in parallel safely"""
    overlap = get_overlap_score(init_a, init_b, overlap_matrix)
    return overlap < threshold

def calculate_max_parallel(approved_initiatives, overlap_matrix, threshold=0.3):
    """Calculate maximum number of initiatives that can run in parallel"""
    
    if len(approved_initiatives) <= 1:
        return len(approved_initiatives)
    
    # Try to find the largest set of initiatives that can all run in parallel
    # This is a maximum independent set problem, but we'll use a greedy approach
    
    # Start with the first initiative
    parallel_set = [approved_initiatives[0]]
    
    # Try to add more initiatives
    for init in approved_initiatives[1:]:
        # Check if this initiative can run in parallel with all current members
        can_add = True
        for existing in parallel_set:
            if not can_run_parallel(init, existing, overlap_matrix, threshold):
                can_add = False
                break
        
        if can_add:
            parallel_set.append(init)
    
    return len(parallel_set), parallel_set

def find_safe_parallel_groups(approved_initiatives, overlap_matrix, threshold=0.3):
    """Find groups of initiatives that can run in parallel"""
    
    groups = []
    remaining = approved_initiatives.copy()
    
    while remaining:
        # Find the largest parallel set from remaining initiatives
        max_size, parallel_set = calculate_max_parallel(remaining, overlap_matrix, threshold)
        
        if max_size > 0:
            groups.append(parallel_set)
            # Remove these from remaining
            for init in parallel_set:
                remaining.remove(init)
        else:
            # Shouldn't happen, but safety check
            break
    
    return groups

def analyze_parallelization():
    """Analyze and output parallelization recommendations"""
    
    registry, overlap, roadmap = load_data()
    if not registry or not overlap:
        return
    
    print("\n" + "="*80)
    print("PARALLELIZATION ANALYSIS")
    print("="*80 + "\n")
    
    # Get approved initiatives
    approved = [init for init in registry['initiatives'] if init['status'] == 'approved']
    in_progress = [init for init in registry['initiatives'] if init['status'] == 'in-progress']
    
    print(f"📊 Current Status:")
    print(f"   Approved & ready: {len(approved)}")
    print(f"   Currently in progress: {len(in_progress)}")
    
    if in_progress:
        print(f"\n🔵 In Progress:")
        for init in in_progress:
            agent = init.get('assigned_to', 'Unknown')
            print(f"   - {init['id']}: {init['title']}")
            print(f"     Agent: {agent}")
    
    if not approved:
        print("\n✅ No approved initiatives waiting - all clear!")
        return
    
    print(f"\n📋 Approved & Waiting:")
    for init in approved:
        print(f"   - {init['id']}: {init['title']}")
    
    # Calculate safe parallelization
    print("\n" + "="*80)
    print("SAFE PARALLELIZATION CALCULATION")
    print("="*80 + "\n")
    
    overlap_matrix = overlap['overlap_matrix']
    
    # Calculate for different thresholds
    thresholds = [
        (0.2, "Conservative (20% overlap max)"),
        (0.3, "Balanced (30% overlap max)"),
        (0.5, "Aggressive (50% overlap max)")
    ]
    
    approved_ids = [init['id'] for init in approved]
    
    for threshold, label in thresholds:
        max_parallel, parallel_set = calculate_max_parallel(approved_ids, overlap_matrix, threshold)
        print(f"{label}:")
        print(f"   Max parallel agents: {max_parallel}")
        if max_parallel > 1:
            print(f"   Can run together: {', '.join(parallel_set)}")
        print()
    
    # Use balanced threshold for recommendations
    max_parallel, parallel_set = calculate_max_parallel(approved_ids, overlap_matrix, 0.3)
    
    print("="*80)
    print("RECOMMENDATION")
    print("="*80 + "\n")
    
    current_agents = len(in_progress)
    can_add = max_parallel - current_agents
    
    if can_add > 0:
        print(f"✅ Safe Agent Count: {max_parallel}")
        print(f"   Currently Running: {current_agents}")
        print(f"   Can Add: {can_add}")
        print()
        print(f"💡 You can safely add {can_add} more agent(s)")
        
        if parallel_set:
            print(f"   → Start agents on: {', '.join(parallel_set[:can_add])}")
    elif can_add == 0:
        print(f"⚠️  At Maximum Capacity")
        print(f"   Currently Running: {current_agents}")
        print(f"   Safe Maximum: {max_parallel}")
        print()
        print(f"💡 Wait for an agent to finish before starting more")
    else:
        print(f"⚠️  Over Capacity!")
        print(f"   Currently Running: {current_agents}")
        print(f"   Safe Maximum: {max_parallel}")
        print()
        print(f"💡 Consider pausing {abs(can_add)} agent(s) to avoid conflicts")
    
    # Check for high-risk overlaps
    print("\n" + "="*80)
    print("CONFLICT WARNINGS")
    print("="*80 + "\n")
    
    has_warnings = False
    for init_a in approved_ids:
        for init_b in approved_ids:
            if init_a >= init_b:
                continue
            
            overlap_score = get_overlap_score(init_a, init_b, overlap_matrix)
            if overlap_score > 0.5:
                has_warnings = True
                print(f"🔴 HIGH RISK: {init_a} ↔ {init_b}")
                print(f"   Overlap: {overlap_score*100:.1f}%")
                print(f"   → These should NOT run in parallel")
                print()
    
    if not has_warnings:
        print("✅ No high-risk conflicts detected")
    
    # Save results
    output = {
        "generated_at": datetime.utcnow().isoformat() + 'Z',
        "current_status": {
            "approved_count": len(approved),
            "in_progress_count": len(in_progress),
            "in_progress_initiatives": [init['id'] for init in in_progress]
        },
        "parallelization": {
            "conservative_max": calculate_max_parallel(approved_ids, overlap_matrix, 0.2)[0],
            "balanced_max": max_parallel,
            "aggressive_max": calculate_max_parallel(approved_ids, overlap_matrix, 0.5)[0],
            "recommended_max": max_parallel,
            "can_add_agents": max(0, can_add),
            "safe_parallel_set": parallel_set
        },
        "recommendations": {
            "action": "add_agents" if can_add > 0 else "wait" if can_add == 0 else "reduce_agents",
            "message": f"You can safely add {can_add} more agent(s)" if can_add > 0 else 
                      "Wait for an agent to finish" if can_add == 0 else
                      f"Consider pausing {abs(can_add)} agent(s)"
        }
    }
    
    output_path = Path("pm-evaluation/parallelization.json")
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\n" + "="*80)
    print(f"📁 Saved to: {output_path}")
    print("="*80 + "\n")

if __name__ == "__main__":
    analyze_parallelization()
