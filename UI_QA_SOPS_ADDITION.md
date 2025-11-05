## UI/UX Quality Assurance Protocol

### Purpose

This protocol defines the most effective and efficient methodology for identifying broken, placeholder, or non-functional UI elements in the TERP application, ensuring adherence to the Production-Ready Code Standard.

### When to Apply

- Before marking any feature as complete
- During code reviews
- After major UI changes or additions
- As part of regular QA checkpoints
- When investigating user-reported UI issues

---

### Three-Layer QA Methodology

The most effective approach combines automated analysis, mobile-specific checks, and expert manual review.

#### Layer 1: Automated Static Analysis

**Purpose**: Quickly scan the entire codebase for common patterns of broken UI elements.

**Tools**: Python-based analyzers that scan React components for:

1. **Missing Handlers**
   - Buttons without `onClick` handlers
   - Forms without `onSubmit` handlers
   - Inputs without `onChange` handlers
   - Toggles/switches without `onCheckedChange` handlers

2. **Placeholder Patterns**
   - Text containing "TODO", "Coming Soon", "Placeholder"
   - Empty function bodies: `onClick={() => {}}`
   - Console-only handlers: `onClick={() => console.log(...)}`
   - Alert-only handlers: `onClick={() => alert(...)}`

3. **Context-Aware Filtering**
   - **Exclude false positives**: Radix UI composition patterns (e.g., `DropdownMenuTrigger asChild`)
   - **Exclude framework patterns**: Router components, form submit buttons
   - **Focus on true bugs**: Standalone buttons, custom components, action buttons

**Implementation**:

```python
# Example: strict_button_analyzer.py
import re
from pathlib import Path

def analyze_file(filepath):
    issues = []
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Pattern: Button without onClick
    pattern = r'<Button[^>]*>(?!.*onClick).*?</Button>'
    for match in re.finditer(pattern, content, re.DOTALL):
        # Filter out false positives
        if 'DropdownMenuTrigger' not in match.group():
            if 'type="submit"' not in match.group():
                issues.append({
                    'type': 'missing_handler',
                    'line': content[:match.start()].count('\n') + 1,
                    'code': match.group()[:100]
                })
    
    return issues
```

**Expected Results**:
- Initial scan: 500-1000+ potential issues
- After filtering: 20-50 true bugs
- False positive rate: 60-70%

#### Layer 2: Mobile-Specific Analysis

**Purpose**: Identify UI issues that only manifest on mobile devices.

**Focus Areas**:

1. **Hidden Elements**
   - Buttons with `hidden md:flex` that have no mobile alternative
   - Critical actions only visible on desktop
   - Navigation elements missing on mobile

2. **Touch Interaction Issues**
   - Buttons in dialogs/sheets without handlers
   - Save buttons in mobile drawers
   - Overlay/z-index issues preventing clicks

3. **Responsive Design Gaps**
   - Elements that overflow on small screens
   - Touch targets smaller than 44x44px
   - Horizontal scrolling issues

**Implementation**:

```python
# Example: mobile_button_analyzer.py

# Pattern 1: Hidden on mobile without alternative
hidden_pattern = r'<Button[^>]*className="[^"]*hidden[^"]*md:[^"]*"'

# Pattern 2: Dialog/Sheet save buttons without handlers
dialog_save_pattern = r'<Dialog[^>]*>.*?<Button[^>]*>.*?[Ss]ave.*?</Button>'

# Pattern 3: Sheet-specific issues
sheet_save_pattern = r'<Sheet[^>]*>.*?<Button[^>]*>.*?[Ss]ave.*?</Button>'
```

**Expected Results**:
- 5-15 mobile-specific issues per audit
- Most common: Missing save buttons in mobile drawers
- Critical: Hidden logout/settings buttons without alternatives

#### Layer 3: Expert Manual Review

**Purpose**: Catch edge cases and context-dependent issues that automated tools miss.

**Process**:

1. **Prioritize High-Traffic Areas**
   - Dashboard widgets
   - Main navigation
   - Critical workflows (create, edit, delete)
   - Settings and configuration pages

2. **Test Each Interactive Element**
   - Click every button
   - Toggle every switch
   - Submit every form
   - Verify expected behavior

3. **Check Edge Cases**
   - Empty states (no data)
   - Error states (API failure)
   - Loading states (slow network)
   - Disabled states (permissions)

4. **Verify User Feedback**
   - Toast notifications appear
   - Loading indicators show
   - Error messages are clear
   - Success confirmations display

**Checklist**:

```markdown
For each interactive element:
- [ ] Has visible feedback on hover
- [ ] Has visible feedback on click
- [ ] Performs expected action
- [ ] Shows loading state if async
- [ ] Shows success/error feedback
- [ ] Handles errors gracefully
- [ ] Works on mobile viewport
- [ ] Accessible via keyboard
- [ ] Has proper ARIA labels
```

---

### Categorization & Prioritization

After identifying issues, categorize by severity:

#### 🔴 Critical (Fix Immediately)
- Buttons in core workflows (save, submit, create)
- Settings/configuration toggles
- Payment/financial actions
- User authentication actions

#### 🟡 High (Fix Within Sprint)
- Secondary workflows (export, download)
- Admin/configuration features
- Reporting and analytics actions
- VIP portal features

#### 🟢 Medium (Fix Next Sprint)
- Nice-to-have features
- Demo/showcase components
- Experimental features
- Cosmetic improvements

---

### Implementation Guidelines

#### For Each Fixed Button:

1. **Add Functional Handler**
   ```typescript
   // ❌ Bad: Empty or console-only
   <Button onClick={() => console.log('clicked')}>Save</Button>
   
   // ✅ Good: Functional with feedback
   <Button onClick={async () => {
     try {
       setLoading(true);
       await saveMutation.mutateAsync(data);
       toast.success('Saved successfully');
     } catch (error) {
       toast.error('Failed to save');
     } finally {
       setLoading(false);
     }
   }}>
     Save
   </Button>
   ```

2. **Add User Feedback**
   - Toast notifications for success/error
   - Loading states during async operations
   - Disabled states when appropriate
   - Navigation after successful actions

3. **Add Error Handling**
   - Try-catch for async operations
   - User-friendly error messages
   - Fallback behavior on failure
   - Logging for debugging

4. **Add Accessibility**
   - `aria-label` for icon-only buttons
   - `aria-busy` during loading
   - `aria-disabled` when disabled
   - Keyboard navigation support

---

### Quality Metrics

Track these metrics to measure UI quality:

- **Button Functionality Rate**: (Working buttons / Total buttons) × 100%
  - Target: 100%
  - Acceptable: 95%+
  - Critical threshold: <90%

- **False Positive Rate**: (False positives / Total findings) × 100%
  - Good: <30%
  - Acceptable: 30-50%
  - Poor: >50%

- **Time to Fix**: Average time from identification to resolution
  - Target: <2 hours per button
  - Acceptable: <4 hours per button
  - Escalate: >8 hours per button

---

### Automation & CI/CD Integration

#### Recommended Setup:

1. **Pre-commit Hook**
   ```bash
   # .husky/pre-commit
   python3 scripts/ui_analysis/strict_button_analyzer.py --fail-on-critical
   ```

2. **CI Pipeline Check**
   ```yaml
   # .github/workflows/qa.yml
   - name: UI QA Check
     run: |
       python3 scripts/ui_analysis/strict_button_analyzer.py
       python3 scripts/ui_analysis/mobile_button_analyzer.py
   ```

3. **Monthly Audit**
   - Run full analysis suite
   - Review all findings
   - Update analysis scripts
   - Document patterns

---

### Analysis Tools Location

All UI QA analysis tools should be stored in:

```
/scripts/ui_analysis/
├── strict_button_analyzer.py      # Desktop button analysis
├── mobile_button_analyzer.py      # Mobile-specific analysis
├── categorize_issues.py           # Categorization & prioritization
└── README.md                      # Tool documentation
```

---

### Success Criteria

A UI element is considered **production-ready** when:

1. ✅ Has functional handler (not placeholder)
2. ✅ Provides user feedback (toast, navigation, or state change)
3. ✅ Handles errors gracefully
4. ✅ Works on desktop and mobile
5. ✅ Accessible via keyboard
6. ✅ Has proper ARIA labels
7. ✅ Passes automated analysis
8. ✅ Passes manual expert review

---

### Common Pitfalls to Avoid

1. **Assuming Radix UI Handles Everything**
   - `DropdownMenuTrigger` wraps buttons, but custom buttons still need handlers
   - Verify each button's actual behavior, not just its wrapper

2. **Ignoring Mobile-Specific Issues**
   - Desktop buttons may work but be hidden on mobile
   - Always test in mobile viewport

3. **Console-Only Handlers**
   - `console.log` is not user feedback
   - Always provide visible feedback

4. **TODO Comments as Completion**
   - TODO comments are not implementations
   - Either implement fully or flag as incomplete

5. **Over-Reliance on Automation**
   - Automated tools have 30-70% false positive rates
   - Always verify findings manually

---

### Related Protocols

This protocol works in conjunction with:

- **Production-Ready Code Standard**: No placeholders or stubs
- **Standard QA Protocols**: Comprehensive testing checklist
- **Breaking Change Protocol**: When fixes affect >5 files
- **Quality Standards Checklist**: Overall code quality requirements

---

### Version History

- **v1.0** (2025-11-05): Initial protocol based on Phase 1 & 2 UI fixes
  - Documented three-layer methodology
  - Added automation guidelines
  - Included categorization framework
  - Established success criteria
