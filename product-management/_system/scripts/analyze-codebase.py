#!/usr/bin/env python3
"""
Codebase Analysis Script with Intelligent Caching
Analyzes TERP codebase incrementally to minimize cost
"""

import json
import hashlib
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set

# Configuration
PROJECT_ROOT = Path("/home/ubuntu/TERP")
PM_ROOT = PROJECT_ROOT / "product-management"
CACHE_FILE = PM_ROOT / "_system/cache/analysis-cache.json"
OUTPUT_FILE = PM_ROOT / "codebase/snapshot.json"

# Directories to analyze
ANALYZE_DIRS = [
    "client/src",
    "server",
    "drizzle",
    "docs"
]

# File extensions to analyze
ANALYZE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx",
    ".md", ".json",
    ".sql"
}

# Ignore patterns
IGNORE_PATTERNS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage"
}


def load_cache() -> Dict:
    """Load existing analysis cache"""
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {
        "schema_version": "1.0",
        "last_full_analysis": None,
        "last_incremental_update": None,
        "file_hashes": {},
        "analysis_results": {},
        "metadata": {
            "total_files": 0,
            "analyzed_files": 0,
            "cache_hit_rate": 0,
            "last_analysis_duration": None
        }
    }


def save_cache(cache: Dict):
    """Save analysis cache"""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)


def get_file_hash(filepath: Path) -> str:
    """Calculate SHA256 hash of file"""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def should_ignore(path: Path) -> bool:
    """Check if path should be ignored"""
    parts = path.parts
    return any(pattern in parts for pattern in IGNORE_PATTERNS)


def get_files_to_analyze() -> List[Path]:
    """Get list of files to analyze"""
    files = []
    for dir_name in ANALYZE_DIRS:
        dir_path = PROJECT_ROOT / dir_name
        if not dir_path.exists():
            continue
        
        for ext in ANALYZE_EXTENSIONS:
            for filepath in dir_path.rglob(f"*{ext}"):
                if not should_ignore(filepath):
                    files.append(filepath)
    
    return files


def analyze_file_lightweight(filepath: Path) -> Dict:
    """
    Lightweight file analysis (no LLM needed)
    Extracts basic metadata and structure
    """
    relative_path = filepath.relative_to(PROJECT_ROOT)
    
    analysis = {
        "path": str(relative_path),
        "type": filepath.suffix,
        "size": filepath.stat().st_size,
        "modified": datetime.fromtimestamp(filepath.stat().st_mtime).isoformat(),
        "lines": 0,
        "imports": [],
        "exports": [],
        "components": [],
        "functions": []
    }
    
    # Read file
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            analysis["lines"] = len(lines)
            
            # Extract imports (simple regex-like parsing)
            for line in lines:
                line = line.strip()
                if line.startswith('import '):
                    # Extract import source
                    if 'from ' in line:
                        parts = line.split('from ')
                        if len(parts) > 1:
                            source = parts[1].strip().strip("';\"")
                            analysis["imports"].append(source)
                
                # Extract exports
                if line.startswith('export '):
                    if 'function ' in line or 'const ' in line or 'class ' in line:
                        # Extract name
                        parts = line.split()
                        if len(parts) > 2:
                            name = parts[2].split('(')[0].split('=')[0].strip()
                            analysis["exports"].append(name)
                
                # Detect React components (simple heuristic)
                if filepath.suffix in {'.tsx', '.jsx'}:
                    if 'function ' in line and line.endswith('{'):
                        parts = line.split('function ')
                        if len(parts) > 1:
                            name = parts[1].split('(')[0].strip()
                            if name and name[0].isupper():
                                analysis["components"].append(name)
    
    except Exception as e:
        analysis["error"] = str(e)
    
    return analysis


def detect_module(filepath: Path) -> str:
    """Detect which module a file belongs to"""
    parts = filepath.parts
    
    # Client-side modules
    if 'client' in parts:
        if 'inventory' in parts:
            return 'inventory'
        elif 'accounting' in parts:
            return 'accounting'
        elif 'dashboard' in parts:
            return 'dashboard'
        elif 'orders' in parts or 'quotes' in parts:
            return 'orders'
        elif 'clients' in parts:
            return 'clients'
        elif 'sales' in parts:
            return 'sales'
        elif 'pricing' in parts:
            return 'pricing'
        else:
            return 'core'
    
    # Server-side modules
    if 'server' in parts:
        filename = filepath.stem.lower()
        if 'inventory' in filename:
            return 'inventory'
        elif 'accounting' in filename or 'ar' in filename or 'ap' in filename:
            return 'accounting'
        elif 'order' in filename or 'quote' in filename:
            return 'orders'
        elif 'client' in filename:
            return 'clients'
        elif 'sales' in filename:
            return 'sales'
        elif 'pricing' in filename or 'cogs' in filename:
            return 'pricing'
        else:
            return 'core'
    
    # Documentation
    if 'docs' in parts:
        return 'documentation'
    
    # Database
    if 'drizzle' in parts:
        return 'database'
    
    return 'other'


def incremental_analysis() -> Dict:
    """
    Perform incremental codebase analysis
    Only re-analyze files that have changed
    """
    print("🔍 Starting incremental codebase analysis...")
    start_time = datetime.now()
    
    # Load cache
    cache = load_cache()
    old_hashes = cache.get("file_hashes", {})
    old_results = cache.get("analysis_results", {})
    
    # Get all files to analyze
    files = get_files_to_analyze()
    print(f"📁 Found {len(files)} files to check")
    
    # Calculate new hashes and detect changes
    new_hashes = {}
    changed_files = []
    unchanged_files = []
    
    for filepath in files:
        path_str = str(filepath.relative_to(PROJECT_ROOT))
        file_hash = get_file_hash(filepath)
        new_hashes[path_str] = file_hash
        
        if path_str not in old_hashes or old_hashes[path_str] != file_hash:
            changed_files.append(filepath)
        else:
            unchanged_files.append(filepath)
    
    print(f"🔄 Changed files: {len(changed_files)}")
    print(f"✓ Unchanged files: {len(unchanged_files)}")
    
    # Analyze only changed files
    new_results = {}
    for filepath in changed_files:
        path_str = str(filepath.relative_to(PROJECT_ROOT))
        print(f"  Analyzing: {path_str}")
        new_results[path_str] = analyze_file_lightweight(filepath)
    
    # Merge with cached results
    final_results = old_results.copy()
    final_results.update(new_results)
    
    # Remove results for deleted files
    current_paths = set(new_hashes.keys())
    final_results = {k: v for k, v in final_results.items() if k in current_paths}
    
    # Build module map
    modules = {}
    for path_str, analysis in final_results.items():
        filepath = PROJECT_ROOT / path_str
        module = detect_module(filepath)
        if module not in modules:
            modules[module] = []
        modules[module].append(path_str)
    
    # Build dependency graph (simple version)
    dependencies = {}
    for path_str, analysis in final_results.items():
        deps = []
        for imp in analysis.get("imports", []):
            # Convert relative imports to absolute paths
            if imp.startswith('.'):
                # Resolve relative import
                pass  # Simplified for now
            else:
                deps.append(imp)
        if deps:
            dependencies[path_str] = deps
    
    # Calculate statistics
    total_lines = sum(a.get("lines", 0) for a in final_results.values())
    total_components = sum(len(a.get("components", [])) for a in final_results.values())
    total_exports = sum(len(a.get("exports", [])) for a in final_results.values())
    
    # Build snapshot
    snapshot = {
        "schema_version": "1.0",
        "generated": datetime.now().isoformat(),
        "analysis_type": "incremental",
        "project": {
            "name": "TERP",
            "root": str(PROJECT_ROOT),
            "total_files": len(final_results),
            "total_lines": total_lines,
            "total_components": total_components,
            "total_exports": total_exports
        },
        "statistics": {
            "files_analyzed": len(changed_files),
            "files_cached": len(unchanged_files),
            "cache_hit_rate": len(unchanged_files) / len(files) if files else 0,
            "analysis_duration_seconds": (datetime.now() - start_time).total_seconds()
        },
        "modules": {
            module: {
                "file_count": len(files),
                "files": files
            }
            for module, files in modules.items()
        },
        "files": final_results,
        "dependencies": dependencies
    }
    
    # Update cache
    cache["file_hashes"] = new_hashes
    cache["analysis_results"] = final_results
    cache["last_incremental_update"] = datetime.now().isoformat()
    cache["metadata"] = {
        "total_files": len(files),
        "analyzed_files": len(changed_files),
        "cache_hit_rate": snapshot["statistics"]["cache_hit_rate"],
        "last_analysis_duration": snapshot["statistics"]["analysis_duration_seconds"]
    }
    
    save_cache(cache)
    
    # Save snapshot
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(snapshot, f, indent=2)
    
    # Print summary
    print(f"\n✅ Analysis complete!")
    print(f"   Total files: {len(files)}")
    print(f"   Analyzed: {len(changed_files)}")
    print(f"   Cached: {len(unchanged_files)}")
    print(f"   Cache hit rate: {snapshot['statistics']['cache_hit_rate']:.1%}")
    print(f"   Duration: {snapshot['statistics']['analysis_duration_seconds']:.1f}s")
    print(f"   Saved to: {OUTPUT_FILE}")
    
    return snapshot


if __name__ == "__main__":
    snapshot = incremental_analysis()
