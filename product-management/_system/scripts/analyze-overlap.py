#!/usr/bin/env python3
"""
Simple Overlap Analyzer
Scans codebase and matches initiatives to files based on keywords
"""

import json
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def scan_codebase():
    """Scan TERP codebase for all source files"""
    terp_root = Path("..")  # From product-management/ to TERP root
    
    source_files = []
    
    # Scan common source directories
    for pattern in ["server/**/*.ts", "client/**/*.tsx", "client/**/*.ts", "drizzle/**/*.sql", "shared/**/*.ts"]:
        for file_path in terp_root.glob(pattern):
            # Get relative path from TERP root
            rel_path = str(file_path.relative_to(terp_root))
            source_files.append(rel_path)
    
    return sorted(source_files)

def extract_keywords_from_initiative(init_id):
    """Extract keywords from initiative documentation"""
    init_dir = Path(f"initiatives/{init_id}")
    
    # Skip if initiative is archived
    if not init_dir.exists():
        return set()
    
    keywords = set()
    
    # Read overview and manifest for keywords
    for doc_file in [init_dir / "overview.md", init_dir / "manifest.json"]:
        if not doc_file.exists():
            continue
        
        try:
            content = doc_file.read_text().lower()
            
            # Extract key terms - be specific, avoid generic words
            # Look for specific module/feature names (not generic words like "client", "error")
            specific_terms = [
                "inventory", "calendar", "comment", "todo", "inbox", 
                "accounting", "ledger", "transaction",
                "intake", "movement", "alert", "sequence"
            ]
            
            for term in specific_terms:
                # Require the term to appear multiple times or in title to avoid false positives
                count = content.count(term)
                if count >= 2:  # Appears at least twice
                    keywords.add(term)
            
            # Extract words from title
            if doc_file.name == "manifest.json":
                manifest = json.loads(doc_file.read_text())
                title_words = re.findall(r'\w+', manifest.get('title', '').lower())
                keywords.update([w for w in title_words if len(w) > 3])
        
        except Exception as e:
            print(f"  Warning: Could not read {doc_file}: {e}")
    
    return keywords

def match_files_to_initiative(source_files, keywords):
    """Match source files to initiative based on keywords"""
    matched_files = []
    
    for file_path in source_files:
        file_lower = file_path.lower()
        
        # Check if any keyword appears in the file path
        for keyword in keywords:
            if keyword in file_lower:
                matched_files.append(file_path)
                break
    
    return matched_files

def calculate_overlap(files_a, files_b):
    """Calculate overlap percentage between two file lists"""
    set_a = set(files_a)
    set_b = set(files_b)
    
    if not set_a or not set_b:
        return 0.0
    
    intersection = set_a & set_b
    union = set_a | set_b
    
    return len(intersection) / len(union)

def extract_modules(files):
    """Extract module names from file paths"""
    modules = set()
    for file_path in files:
        # Extract first directory (e.g., "server" from "server/inventory.ts")
        parts = file_path.split('/')
        if len(parts) > 1:
            modules.add(parts[0])
    return modules

def analyze_all_overlaps():
    """Generate overlap matrix for all initiatives"""
    
    # Load registry
    registry_path = Path("initiatives/registry.json")
    if not registry_path.exists():
        print("❌ Error: initiatives/registry.json not found")
        return None
    
    with open(registry_path) as f:
        registry = json.load(f)
    
    # Scan codebase
    print("\n" + "="*80)
    print("SCANNING CODEBASE")
    print("="*80 + "\n")
    
    source_files = scan_codebase()
    print(f"Found {len(source_files)} source files in TERP codebase")
    
    # Extract keywords and match files for each initiative
    print("\n" + "="*80)
    print("MATCHING INITIATIVES TO FILES")
    print("="*80 + "\n")
    
    initiative_files = {}
    initiative_keywords = {}
    initiative_modules = {}
    
    for init in registry['initiatives']:
        init_id = init['id']
        keywords = extract_keywords_from_initiative(init_id)
        files = match_files_to_initiative(source_files, keywords)
        modules = extract_modules(files)
        
        initiative_keywords[init_id] = sorted(list(keywords))
        initiative_files[init_id] = files
        initiative_modules[init_id] = sorted(list(modules))
        
        print(f"{init_id}:")
        print(f"  Keywords: {', '.join(sorted(keywords)) if keywords else 'none'}")
        print(f"  Matched files: {len(files)}")
        print(f"  Modules: {', '.join(sorted(modules)) if modules else 'none'}")
        if files and len(files) <= 5:
            for f in files:
                print(f"    - {f}")
        elif files:
            for f in files[:3]:
                print(f"    - {f}")
            print(f"    ... and {len(files)-3} more")
    
    # Calculate overlap matrix
    print("\n" + "="*80)
    print("CALCULATING OVERLAPS")
    print("="*80 + "\n")
    
    overlap_matrix = {}
    for init_a in initiative_files:
        for init_b in initiative_files:
            if init_a >= init_b:  # Only calculate once (symmetric)
                continue
            
            overlap = calculate_overlap(
                initiative_files[init_a],
                initiative_files[init_b]
            )
            
            shared_files = sorted(list(set(initiative_files[init_a]) & set(initiative_files[init_b])))
            shared_modules = sorted(list(set(initiative_modules[init_a]) & set(initiative_modules[init_b])))
            
            key = f"{init_a}_{init_b}"
            overlap_matrix[key] = {
                "init_a": init_a,
                "init_b": init_b,
                "overlap_pct": round(overlap, 3),
                "shared_files": shared_files,
                "shared_files_count": len(shared_files),
                "shared_modules": shared_modules,
                "risk_level": "high" if overlap > 0.5 else "medium" if overlap > 0.2 else "low"
            }
            
            if overlap > 0:
                icon = "🔴" if overlap > 0.5 else "🟡" if overlap > 0.2 else "🟢"
                print(f"{icon} {init_a} ↔ {init_b}: {overlap*100:.1f}% overlap ({len(shared_files)} shared files)")
                if shared_files and len(shared_files) <= 3:
                    for f in shared_files:
                        print(f"     - {f}")
                elif shared_files:
                    for f in shared_files[:3]:
                        print(f"     - {f}")
                    print(f"     ... and {len(shared_files)-3} more")
    
    # Save results
    output = {
        "generated_at": datetime.utcnow().isoformat() + 'Z',
        "codebase_files_count": len(source_files),
        "initiative_keywords": initiative_keywords,
        "initiative_files": initiative_files,
        "initiative_modules": initiative_modules,
        "overlap_matrix": overlap_matrix,
        "summary": {
            "total_initiatives": len(initiative_files),
            "total_comparisons": len(overlap_matrix),
            "high_risk_pairs": len([v for v in overlap_matrix.values() if v['risk_level'] == 'high']),
            "medium_risk_pairs": len([v for v in overlap_matrix.values() if v['risk_level'] == 'medium']),
            "low_risk_pairs": len([v for v in overlap_matrix.values() if v['risk_level'] == 'low'])
        }
    }
    
    output_path = Path("pm-evaluation/overlap-analysis.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\n✅ Analyzed {len(initiative_files)} initiatives")
    print(f"   Codebase files scanned: {len(source_files)}")
    print(f"   Total comparisons: {len(overlap_matrix)}")
    print(f"   High risk pairs: {output['summary']['high_risk_pairs']}")
    print(f"   Medium risk pairs: {output['summary']['medium_risk_pairs']}")
    print(f"   Low risk pairs: {output['summary']['low_risk_pairs']}")
    print(f"\n📁 Saved to: {output_path}")
    print("="*80 + "\n")
    
    return output

if __name__ == "__main__":
    analyze_all_overlaps()
