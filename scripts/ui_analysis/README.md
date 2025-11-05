# UI Analysis Scripts

Automated tools for identifying broken, placeholder, or non-functional UI elements in the TERP application.

## Overview

These scripts implement the **UI/UX Quality Assurance Protocol** defined in `DEVELOPMENT_PROTOCOLS.md`. They provide a three-layer analysis approach:

1. **Automated Static Analysis** - Scan for missing handlers and placeholder patterns
2. **Mobile-Specific Analysis** - Identify mobile viewport issues
3. **Manual Review Support** - Categorize and prioritize findings

## Scripts

### `strict_button_analyzer.py`

**Purpose**: Find buttons without onClick handlers and placeholder implementations.

**Usage**:
```bash
python3 scripts/ui_analysis/strict_button_analyzer.py
```

**Output**:
- Console report with categorized issues
- `strict_analysis.json` with detailed findings

**What it detects**:
- Buttons without `onClick` handlers
- Empty function bodies: `onClick={() => {}}`
- Console-only handlers: `onClick={() => console.log(...)}`
- Placeholder text patterns

**Filtering**:
- Excludes Radix UI composition patterns (DropdownMenuTrigger, etc.)
- Excludes form submit buttons
- Excludes router Link components

### `mobile_button_analyzer.py`

**Purpose**: Identify mobile-specific UI issues.

**Usage**:
```bash
python3 scripts/ui_analysis/mobile_button_analyzer.py
```

**Output**:
- Console report with mobile-specific issues
- `mobile_analysis.json` with detailed findings
- List of all widget/dashboard files

**What it detects**:
- Buttons hidden on mobile without alternatives
- Dialog/Sheet save buttons without handlers
- Touch interaction issues
- Z-index/overlay problems

### `categorize_strict_issues.py`

**Purpose**: Categorize findings into true bugs vs. false positives.

**Usage**:
```bash
python3 scripts/ui_analysis/categorize_strict_issues.py
```

**Output**:
- `categorized_issues.json` with prioritized findings
- Separated by: True Bugs, False Positives, Needs Investigation

**Categories**:
- 🔴 Critical: Core workflow buttons
- 🟡 High: Secondary features
- 🟢 Medium: Nice-to-have features

### `refined_analyzer.py`

**Purpose**: Context-aware analysis with intelligent filtering.

**Usage**:
```bash
python3 scripts/ui_analysis/refined_analyzer.py
```

**Output**:
- `refined_report.md` with categorized findings
- `refined_report.json` with structured data

**Features**:
- Advanced pattern matching
- Context-aware filtering
- Severity classification
- File-by-file breakdown

### `edge_case_analyzer.py`

**Purpose**: Detect potential runtime issues and edge cases.

**Usage**:
```bash
python3 scripts/ui_analysis/edge_case_analyzer.py
```

**Output**:
- `edge_case_report.json` with potential issues

**What it detects**:
- Null/undefined access patterns
- Array access without bounds checking
- Missing error handling
- Unsafe type assertions

## Typical Workflow

### 1. Initial Scan

```bash
# Run all analyzers
python3 scripts/ui_analysis/strict_button_analyzer.py
python3 scripts/ui_analysis/mobile_button_analyzer.py
python3 scripts/ui_analysis/edge_case_analyzer.py
```

### 2. Review Findings

```bash
# Check the generated reports
cat scripts/ui_analysis/strict_analysis.json
cat scripts/ui_analysis/mobile_analysis.json
```

### 3. Categorize Issues

```bash
# Separate true bugs from false positives
python3 scripts/ui_analysis/categorize_strict_issues.py
```

### 4. Prioritize Fixes

Review `categorized_issues.json` and fix in order:
1. 🔴 Critical issues first
2. 🟡 High priority next
3. 🟢 Medium priority last

### 5. Verify Fixes

After fixing, re-run analyzers to confirm:
```bash
python3 scripts/ui_analysis/strict_button_analyzer.py
```

## Expected Results

### Initial Scan
- **Total findings**: 500-1000+ potential issues
- **After filtering**: 20-50 true bugs
- **False positive rate**: 60-70%

### Mobile Scan
- **Typical findings**: 5-15 mobile-specific issues
- **Most common**: Missing save buttons in drawers
- **Critical**: Hidden actions without alternatives

## Integration with CI/CD

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
python3 scripts/ui_analysis/strict_button_analyzer.py --fail-on-critical
```

### GitHub Actions

```yaml
# .github/workflows/qa.yml
name: UI QA Check

on: [push, pull_request]

jobs:
  ui-qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run UI Analysis
        run: |
          python3 scripts/ui_analysis/strict_button_analyzer.py
          python3 scripts/ui_analysis/mobile_button_analyzer.py
```

## Common False Positives

These patterns are **intentionally excluded** as false positives:

1. **Radix UI Composition**
   ```tsx
   <DropdownMenuTrigger asChild>
     <Button>Menu</Button>  {/* Handled by DropdownMenuTrigger */}
   </DropdownMenuTrigger>
   ```

2. **Form Submit Buttons**
   ```tsx
   <form onSubmit={handleSubmit}>
     <Button type="submit">Submit</Button>  {/* Handled by form */}
   </form>
   ```

3. **Router Links**
   ```tsx
   <Link to="/path">
     <Button>Navigate</Button>  {/* Handled by Link */}
   </Link>
   ```

## Troubleshooting

### Script Fails to Run

**Issue**: `ModuleNotFoundError: No module named 'X'`

**Solution**: Install required dependencies
```bash
pip3 install beautifulsoup4 lxml
```

### Too Many False Positives

**Issue**: Analyzer reports too many non-issues

**Solution**: Update filtering patterns in the script or use `categorize_strict_issues.py` to separate true bugs

### Missing Issues

**Issue**: Analyzer doesn't catch a known bug

**Solution**: 
1. Check if the pattern is too specific
2. Add new detection pattern to the script
3. Rely on Layer 3 (manual review) for edge cases

## Maintenance

### Monthly Audit

1. Run full analysis suite
2. Review all findings
3. Update filtering patterns based on new false positives
4. Document new patterns in this README

### Script Updates

When updating scripts:
1. Test on a small subset first
2. Verify false positive rate hasn't increased
3. Update this README with new patterns
4. Commit with clear description of changes

## Related Documentation

- **DEVELOPMENT_PROTOCOLS.md**: UI/UX Quality Assurance Protocol
- **UI_FIXES_PHASE2_FINAL_REPORT.md**: Example analysis results
- **CHANGELOG.md**: History of UI fixes

## Version History

- **v1.0** (2025-11-05): Initial scripts from Phase 1 & 2 UI fixes
  - strict_button_analyzer.py
  - mobile_button_analyzer.py
  - categorize_strict_issues.py
  - refined_analyzer.py
  - edge_case_analyzer.py
