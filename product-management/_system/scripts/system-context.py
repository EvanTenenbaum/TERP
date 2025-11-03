#!/usr/bin/env python3
"""
System Context Scanner

Scans the TERP codebase to generate a comprehensive state report for the PM system.
This enables the PM to have complete context of both current state and future initiatives.

Usage:
    python3 system-context.py scan
    python3 system-context.py view
    python3 system-context.py summary
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import subprocess

# Paths
SCRIPT_DIR = Path(__file__).parent
PM_ROOT = SCRIPT_DIR.parent.parent
TERP_ROOT = PM_ROOT.parent
CLIENT_DIR = TERP_ROOT / "client"
SERVER_DIR = TERP_ROOT / "server"
DOCS_DIR = TERP_ROOT / "docs"
CONTEXT_DIR = PM_ROOT / "_system" / "context"

# Context files
PROJECT_CONTEXT = DOCS_DIR / "PROJECT_CONTEXT.md"
CHANGELOG = DOCS_DIR / "CHANGELOG.md"
BIBLE = DOCS_DIR / "DEVELOPMENT_PROTOCOLS.md"
KNOWN_ISSUES = DOCS_DIR / "notes" / "known-issues.md"

# Output files
SYSTEM_STATE_JSON = CONTEXT_DIR / "system-state.json"
SYSTEM_SUMMARY_MD = CONTEXT_DIR / "system-summary.md"


def scan_routes(client_dir):
    """Scan Next.js app directory for routes"""
    routes = []
    app_dir = client_dir / "src" / "app"
    
    if not app_dir.exists():
        return routes
    
    for path in app_dir.rglob("page.tsx"):
        # Get route from path
        route_path = path.relative_to(app_dir).parent
        if route_path == Path("."):
            route = "/"
        else:
            route = "/" + str(route_path).replace("\\", "/")
        
        routes.append({
            "route": route,
            "file": str(path.relative_to(TERP_ROOT)),
            "type": "page"
        })
    
    return routes


def scan_api_endpoints(server_dir):
    """Scan server directory for API endpoints"""
    endpoints = []
    routes_dir = server_dir / "src" / "routes"
    
    if not routes_dir.exists():
        return endpoints
    
    for path in routes_dir.rglob("*.ts"):
        # Read file to find route definitions
        try:
            with open(path, 'r') as f:
                content = f.read()
                
            # Look for router.get, router.post, etc.
            import re
            patterns = [
                r'router\.(get|post|put|delete|patch)\([\'"]([^\'"]+)',
                r'app\.(get|post|put|delete|patch)\([\'"]([^\'"]+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for method, route in matches:
                    endpoints.append({
                        "method": method.upper(),
                        "path": route,
                        "file": str(path.relative_to(TERP_ROOT))
                    })
        except Exception as e:
            continue
    
    return endpoints


def scan_components(client_dir):
    """Scan for major React components"""
    components = []
    components_dir = client_dir / "src" / "components"
    
    if not components_dir.exists():
        return components
    
    for path in components_dir.rglob("*.tsx"):
        # Skip index files and small utility files
        if path.name in ["index.tsx", "index.ts"]:
            continue
        
        # Get component name from file
        component_name = path.stem
        
        components.append({
            "name": component_name,
            "file": str(path.relative_to(TERP_ROOT)),
            "directory": str(path.parent.relative_to(components_dir))
        })
    
    return components


def scan_tech_stack(terp_root):
    """Extract tech stack from package.json files"""
    tech_stack = {}
    
    # Client package.json
    client_pkg = terp_root / "client" / "package.json"
    if client_pkg.exists():
        with open(client_pkg, 'r') as f:
            pkg = json.load(f)
            deps = pkg.get("dependencies", {})
            
            tech_stack["frontend"] = {
                "framework": "Next.js" if "next" in deps else "Unknown",
                "ui_library": "React" if "react" in deps else "Unknown",
                "styling": "Tailwind CSS" if "tailwindcss" in deps else "Unknown",
                "auth": "Clerk" if "@clerk/nextjs" in deps else "Unknown"
            }
    
    # Server package.json
    server_pkg = terp_root / "server" / "package.json"
    if server_pkg.exists():
        with open(server_pkg, 'r') as f:
            pkg = json.load(f)
            deps = pkg.get("dependencies", {})
            
            tech_stack["backend"] = {
                "framework": "Express" if "express" in deps else "Unknown",
                "database": "PostgreSQL" if "pg" in deps else "Unknown",
                "orm": "Prisma" if "prisma" in deps else "Unknown"
            }
    
    return tech_stack


def parse_known_issues(known_issues_file):
    """Parse known issues from markdown file"""
    issues = []
    
    if not known_issues_file.exists():
        return issues
    
    try:
        with open(known_issues_file, 'r') as f:
            content = f.read()
        
        # Simple parsing - look for list items or headings
        import re
        # Match lines starting with - or * or numbered lists
        issue_lines = re.findall(r'^[\-\*\d\.]+\s+(.+)$', content, re.MULTILINE)
        
        for i, line in enumerate(issue_lines[:10]):  # Limit to 10
            issues.append({
                "id": f"ISSUE-{i+1:03d}",
                "title": line.strip(),
                "severity": "unknown"
            })
    except Exception as e:
        pass
    
    return issues


def parse_recent_changes(changelog_file):
    """Parse recent changes from CHANGELOG.md"""
    changes = []
    
    if not changelog_file.exists():
        return changes
    
    try:
        with open(changelog_file, 'r') as f:
            content = f.read()
        
        # Look for version headings or date headings
        import re
        # Match markdown headings with dates or versions
        sections = re.split(r'^##\s+', content, flags=re.MULTILINE)
        
        for section in sections[1:6]:  # Get last 5 sections
            lines = section.split('\n')
            title = lines[0].strip()
            
            changes.append({
                "title": title,
                "summary": lines[1].strip() if len(lines) > 1 else ""
            })
    except Exception as e:
        pass
    
    return changes


def extract_bible_protocols(bible_file):
    """Extract key protocols from DEVELOPMENT_PROTOCOLS.md"""
    protocols = []
    
    if not bible_file.exists():
        return protocols
    
    try:
        with open(bible_file, 'r') as f:
            content = f.read()
        
        # Look for major section headings
        import re
        headings = re.findall(r'^##\s+(.+)$', content, flags=re.MULTILINE)
        
        for heading in headings[:10]:  # Top 10 protocols
            protocols.append(heading.strip())
    except Exception as e:
        pass
    
    return protocols


def scan_codebase():
    """Perform full codebase scan"""
    print("🔍 Scanning TERP codebase...")
    
    # Create context directory
    CONTEXT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Scan different aspects
    print("  📄 Scanning routes...")
    routes = scan_routes(CLIENT_DIR)
    
    print("  🔌 Scanning API endpoints...")
    api_endpoints = scan_api_endpoints(SERVER_DIR)
    
    print("  🧩 Scanning components...")
    components = scan_components(CLIENT_DIR)
    
    print("  📦 Analyzing tech stack...")
    tech_stack = scan_tech_stack(TERP_ROOT)
    
    print("  ⚠️  Parsing known issues...")
    known_issues = parse_known_issues(KNOWN_ISSUES)
    
    print("  📝 Parsing recent changes...")
    recent_changes = parse_recent_changes(CHANGELOG)
    
    print("  📖 Extracting Bible protocols...")
    bible_protocols = extract_bible_protocols(BIBLE)
    
    # Build system state
    system_state = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "routes": routes,
        "api_endpoints": api_endpoints,
        "components": {
            "count": len(components),
            "major_components": [c["name"] for c in components[:20]]
        },
        "tech_stack": tech_stack,
        "known_issues": known_issues,
        "recent_changes": recent_changes,
        "bible_protocols": bible_protocols,
        "statistics": {
            "total_routes": len(routes),
            "total_api_endpoints": len(api_endpoints),
            "total_components": len(components),
            "total_known_issues": len(known_issues)
        }
    }
    
    # Save JSON
    with open(SYSTEM_STATE_JSON, 'w') as f:
        json.dump(system_state, f, indent=2)
    
    print(f"\n✅ System state saved to: {SYSTEM_STATE_JSON}")
    
    # Generate summary
    generate_summary(system_state)
    
    return system_state


def generate_summary(system_state):
    """Generate human-readable summary"""
    summary = f"""# TERP System State Summary

**Last Updated**: {system_state['last_updated']}

---

## Overview

The TERP system is a comprehensive ERP platform built with modern web technologies.

---

## Tech Stack

### Frontend
{json.dumps(system_state['tech_stack'].get('frontend', {}), indent=2)}

### Backend
{json.dumps(system_state['tech_stack'].get('backend', {}), indent=2)}

---

## Current Features

### Routes ({system_state['statistics']['total_routes']})
"""
    
    for route in system_state['routes'][:15]:
        summary += f"- `{route['route']}` - {route['file']}\n"
    
    if len(system_state['routes']) > 15:
        summary += f"- ... and {len(system_state['routes']) - 15} more\n"
    
    summary += f"\n### API Endpoints ({system_state['statistics']['total_api_endpoints']})\n"
    
    for endpoint in system_state['api_endpoints'][:15]:
        summary += f"- `{endpoint['method']} {endpoint['path']}` - {endpoint['file']}\n"
    
    if len(system_state['api_endpoints']) > 15:
        summary += f"- ... and {len(system_state['api_endpoints']) - 15} more\n"
    
    summary += f"\n### Major Components ({system_state['statistics']['total_components']})\n"
    
    for comp in system_state['components']['major_components']:
        summary += f"- {comp}\n"
    
    summary += "\n---\n\n## Known Issues\n\n"
    
    if system_state['known_issues']:
        for issue in system_state['known_issues']:
            summary += f"- **{issue['id']}**: {issue['title']}\n"
    else:
        summary += "*No known issues documented.*\n"
    
    summary += "\n---\n\n## Recent Changes\n\n"
    
    if system_state['recent_changes']:
        for change in system_state['recent_changes']:
            summary += f"### {change['title']}\n{change['summary']}\n\n"
    else:
        summary += "*No recent changes documented.*\n"
    
    summary += "\n---\n\n## Bible Protocols\n\n"
    
    for protocol in system_state['bible_protocols']:
        summary += f"- {protocol}\n"
    
    summary += "\n---\n\n## Statistics\n\n"
    summary += f"- **Total Routes**: {system_state['statistics']['total_routes']}\n"
    summary += f"- **Total API Endpoints**: {system_state['statistics']['total_api_endpoints']}\n"
    summary += f"- **Total Components**: {system_state['statistics']['total_components']}\n"
    summary += f"- **Known Issues**: {system_state['statistics']['total_known_issues']}\n"
    
    # Save summary
    with open(SYSTEM_SUMMARY_MD, 'w') as f:
        f.write(summary)
    
    print(f"✅ System summary saved to: {SYSTEM_SUMMARY_MD}")


def view_state():
    """View current system state"""
    if not SYSTEM_STATE_JSON.exists():
        print("❌ No system state found. Run 'scan' first.")
        return
    
    with open(SYSTEM_STATE_JSON, 'r') as f:
        state = json.load(f)
    
    print(json.dumps(state, indent=2))


def show_summary():
    """Show system summary"""
    if not SYSTEM_SUMMARY_MD.exists():
        print("❌ No system summary found. Run 'scan' first.")
        return
    
    with open(SYSTEM_SUMMARY_MD, 'r') as f:
        print(f.read())


def main():
    if len(sys.argv) < 2:
        print("Usage: system-context.py <command>")
        print("\nCommands:")
        print("  scan     - Scan the codebase and generate system state")
        print("  view     - View system state JSON")
        print("  summary  - Show system summary")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "scan":
        scan_codebase()
    elif command == "view":
        view_state()
    elif command == "summary":
        show_summary()
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
