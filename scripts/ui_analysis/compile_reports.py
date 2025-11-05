#!/usr/bin/env python3
"""
Compile TERP UI Analysis Reports

This script combines the findings from the refined static analysis and the
edge case analysis into a single, comprehensive Markdown report.
"""

import json
from pathlib import Path
from collections import defaultdict

class ReportCompiler:
    def __init__(self, static_report_path: Path, edge_case_report_path: Path):
        self.static_report = json.loads(static_report_path.read_text())
        self.edge_case_report = json.loads(edge_case_report_path.read_text())
        self.combined_issues = defaultdict(list)

    def combine_reports(self):
        """Merge issues from both reports, avoiding duplicates."""
        # Process refined static analysis report
        for file_path, issue_types in self.static_report["issues"].items():
            for issue_type, issues in issue_types.items():
                for issue in issues:
                    self.combined_issues[file_path].append({
                        "source": "static",
                        "type": issue.get("type", "unknown"),
                        "severity": issue.get("severity", "unknown").upper(),
                        "line": issue.get("line"),
                        "description": issue.get("description"),
                        "context": issue.get("context", ""),
                    })

        # Process edge case analysis report
        for file_path, issues in self.edge_case_report["issues"].items():
            for issue in issues:
                # Simple check to avoid adding very similar issues for the same line
                is_duplicate = False
                for existing_issue in self.combined_issues[file_path]:
                    if existing_issue["line"] == issue.get("line") and existing_issue["type"] == issue.get("type"):
                        is_duplicate = True
                        break
                if not is_duplicate:
                    self.combined_issues[file_path].append({
                        "source": "edge_case",
                        "type": issue.get("type", "unknown"),
                        "severity": issue.get("severity", "unknown").upper(),
                        "line": issue.get("line"),
                        "description": issue.get("description"),
                        "recommendation": issue.get("recommendation", ""),
                    })

    def get_summary(self):
        """Generate summary statistics for the combined report."""
        total_files = len(self.combined_issues)
        issues_by_severity = defaultdict(int)
        issues_by_type = defaultdict(int)

        for issues in self.combined_issues.values():
            for issue in issues:
                issues_by_severity[issue["severity"]] += 1
                issues_by_type[issue["type"]] += 1

        total_issues = sum(issues_by_severity.values())

        return {
            "total_files_with_issues": total_files,
            "total_issues": total_issues,
            "issues_by_severity": dict(sorted(issues_by_severity.items(), key=lambda x: ("CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN").index(x[0]))),
            "issues_by_type": dict(sorted(issues_by_type.items(), key=lambda x: x[1], reverse=True)),
        }

    def generate_markdown_report(self, output_path: Path):
        """Generate the final comprehensive Markdown report."""
        summary = self.get_summary()
        issues_by_severity = summary["issues_by_severity"]
        severity_order = ["HIGH", "MEDIUM", "LOW"]

        md = []
        md.append("# Comprehensive UI & Edge Case Analysis for TERP")
        md.append("## 1. Executive Summary")
        md.append(f"This report provides a consolidated analysis of the TERP frontend codebase, combining static analysis for concrete UI bugs and a deeper scan for potential edge cases. The analysis identified **{summary['total_issues']}** issues across **{summary['total_files_with_issues']}** files.")

        md.append("### Overall Findings by Severity")
        md.append("| Severity | Count | Percentage |")
        md.append("|:---|---:|---:|")
        for severity, count in issues_by_severity.items():
            percentage = (count / summary["total_issues"]) * 100
            md.append(f"| {severity} | {count} | {percentage:.1f}% |")
        md.append("")

        md.append("### Top 5 Issue Categories")
        md.append("| Category | Count |")
        md.append("|:---|---:|")
        for i, (issue_type, count) in enumerate(summary["issues_by_type"].items()):
            if i < 5:
                md.append(f"| {issue_type.replace('_', ' ').title()} | {count} |")
        md.append("")

        md.append("## 2. Prioritized Action Plan")
        md.append("Based on the severity of the findings, the following actions are recommended:")
        md.append(f"1.  **Critical & High Priority (Immediate Action):** Focus on the **{issues_by_severity.get('HIGH', 0)}** high-severity issues. These include non-functional buttons, broken toggles, and potential state mutations that can lead to critical application errors. These should be addressed immediately to ensure core functionality and stability.")
        md.append(f"2.  **Medium Priority (Short-Term Action):** Address the **{issues_by_severity.get('MEDIUM', 0)}** medium-severity issues. This category includes missing input validation, potential null access errors, and accessibility gaps. Fixing these will improve application robustness and user experience.")
        md.append(f"3.  **Low Priority (Long-Term Improvement):** The **{issues_by_severity.get('LOW', 0)}** low-severity issues, such as performance optimizations and unbounded text inputs, can be addressed as part of regular maintenance cycles to improve code quality and long-term scalability.")

        md.append("---\n")

        md.append("## 3. Detailed Findings by Severity")

        for severity in severity_order:
            issues_in_severity = []
            for file_path, issues in self.combined_issues.items():
                for issue in issues:
                    if issue["severity"] == severity:
                        issues_in_severity.append({**issue, "file": file_path})

            if not issues_in_severity:
                continue

            md.append(f"### {severity.title()} Severity Issues ({len(issues_in_severity)} found)")

            # Group by type
            by_type = defaultdict(list)
            for issue in issues_in_severity:
                by_type[issue["type"]].append(issue)

            for issue_type, issues in sorted(by_type.items(), key=lambda x: len(x[1]), reverse=True)[:5]:  # Top 5 types
                md.append(f"#### {issue_type.replace('_', ' ').title()} ({len(issues)} issues)")
                for issue in issues[:3]:  # Top 3 examples
                    md.append(f'- **File:** `{issue["file"]}` (Line: {issue["line"]})')
                    md.append(f'  - **Description:** {issue["description"]}')
                    if issue.get("recommendation"):
                        md.append(f'  - **Recommendation:** {issue["recommendation"]}')
                    if issue.get("context"):
                        md.append(f"  - **Context:**\n```tsx\n{issue['context']}\n```")
                md.append("")

        output_path.write_text("\n".join(md))


if __name__ == "__main__":
    compiler = ReportCompiler(
        Path("/home/ubuntu/ui_analysis/refined_report.json"),
        Path("/home/ubuntu/ui_analysis/edge_case_report.json"),
    )
    print("Combining reports...")
    compiler.combine_reports()

    print("Generating final comprehensive report...")
    compiler.generate_markdown_report(Path("/home/ubuntu/ui_analysis/comprehensive_ui_report.md"))

    summary = compiler.get_summary()
    print("\n✓ Comprehensive report generated successfully!")
    print(f"  - Total issues compiled: {summary['total_issues']}")
    print(f"  - Report saved to /home/ubuntu/ui_analysis/comprehensive_ui_report.md")
