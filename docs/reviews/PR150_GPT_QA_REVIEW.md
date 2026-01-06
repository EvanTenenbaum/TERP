# GPT Red Hat QA Review - PR #150

**PR Title**: Fix dashboard performance and safety issues (PERF-004, BUG-007)

**Review Date**: 2026-01-06

---

## Red Hat QA Review for PR #150: "Fix dashboard performance and safety issues (PERF-004, BUG-007)"

---

### 1. Executive Summary

This PR replaces unsafe native browser dialogs (confirm/prompt/alert) with a custom `<ConfirmDialog>` modal, improving UX and aligning with React best practices. The work touches key scheduling, time-off requests, live shopping console, and VIP session files—standardizing confirmation flows and removing blocking UI interactions. Most implementation is sound and a clear improvement. However, several error handling, type-safety, and security best practice issues exist, with a few areas for critical attention before merging.

---

### 2. Critical Issues (must fix before merge)

**A. Security: Use of `globalThis.prompt` and `globalThis.alert`**  
- **Files:** `AppointmentRequestsList.tsx`, `TimeOffRequestsList.tsx`, `StaffSessionConsole.tsx`, `LiveShoppingSession.tsx`
- **Issue:** While `window.prompt`/`window.alert` is less blocking than before, relying on these **can still leak sensitive data** (prompt inputs are not masked, alert texts can disclose logic) and is bad for accessibility/consistency.
- **Fix:** **Migrate prompts and alerts to modal-based, managed UI dialogs**, similar to how confirm dialogs are handled.
  - Implement a custom PromptDialog and AlertDialog component, handle user text-input and notifications in a controlled and secure way.

**B. UI State Leak / Dialog Handling Bug**
- **Files:** All affected
- **Issue:** When a dialog is canceled (for example, the user closes a confirmation dialog), the `requestToApprove`, `requestToHandle`, or `itemToRemove` variables are not always reset to `null`. This could result in stale state and unintended actions on the wrong item if the user takes further actions.
- **Fix:** Add an `onOpenChange` handler for each dialog that, on close, resets the associated `*_ToHandle/*_ToRemove` state to `null`. Example:
    ```ts
    onOpenChange={(isOpen) => {
      setApproveDialogOpen(isOpen);
      if (!isOpen) setRequestToHandle(null);
    }}
    ```

**C. Potential Race Condition / Double Submit**  
- **Files:** All affected
- **Issue:** During async mutation (e.g., clicking confirmApprove), another action could be triggered before reset of the state; also, there appears to be no disabling of the underlying UI or button during isLoading/isPending.
- **Fix:**  
    - Ensure the confirm button is disabled while the mutation is pending.  
    - Optionally, debounce/delay actions until the response returns.
    - Prevent double invocation of confirm actions.
    - Consider setting the state immediately after `.mutateAsync/.mutate()` is called, not after `await`, in the onConfirm handlers.

---

### 3. High Priority Issues (should fix soon)

**A. Error Handling Missing for Mutations**  
- **Files:** All affected
- **Issue:** None of the async mutations (approve, reject, cancel, remove, end session, etc.) handle errors (failed network, server reject, etc.). User gets no feedback on failure.
- **Fix:** Add `.catch()`/`.onError` handlers. 
    - Show errors in the UI or at least log them, reset state if needed.
    - Example:
      ```ts
      await approveMutation.mutateAsync({ requestId }).catch((err) => {
        // Show user-friendly error toast/dialog
      });
      ```

**B. Lack of User Feedback On Success/Error**  
- **Files:** All
- **Issue:** Users are not notified on successful or failed actions (except for some remaining `alert()`s).
- **Fix:** Use a notification system (e.g., toast, snackbar) to provide confirmatory or error messages for actions.

**C. Inconsistent Dialog Component Usage**  
- **File:** `StaffSessionConsole.tsx` (and others)
- **Issue:** The dialog for "convert to order" and "end session" flips label, variant, and title via ternary operator in props. This is fragile and makes for hard-to-maintain code.
- **Fix:** Consider predefining dialog props config to pass in, for clarity and less branching.

---

### 4. Medium Priority Issues (nice to fix)

**A. Type Safety and Typescript Inconsistencies**
- **Files:** Various
- **Issues:**  
    - There are some `number | null` patterns that could be better expressed using more specific types.
    - Some mutation handlers accept parameters but do not type them fully.
    - Some missing types for dialog-related props.
- **Fix:**  
    - Explicitly type all state and callback function signatures.
    - Avoid using `any` or implicit types for props/params.

**B. Dead Code & Naming**
- **File:**  
    - `StaffSessionConsole.tsx` (`currentStatus` is renamed to `_currentStatus` but unused; re-check for unnecessary props).
    - `LiveShoppingSession.tsx` unused state `_setPriceChanges`.
- **Fix:** Remove or clarify why such renames exist. Remove unused state setters unless needed for effect.

**C. Limiting Magic Numbers (pagination)**
- **Files:** All
- **Issue:** Hardcoded `limit: 50` for queries. It’s a magic constant.
- **Fix:** Move to a constant or config somewhere.

---

### 5. Low Priority/Suggestions

- **Accessibility:** Ensure `ConfirmDialog` and future `PromptDialog`/`AlertDialog` components are accessible (focus management, ARIA roles, keyboard actions).
- **Documentation:** Functions, especially those involving side-effects and mutations, would benefit from inline documentation.
- **Testing:** Consider writing tests for scenario coverage: dialog opening, closing, success, error, cancellation state, double submit prevention.
- **Null/Undefined Guards:** In a few places, default value protection could be made more robust (e.g., if `data.requests` is potentially undefined).

---

### 6. What was Done Well

- Proper replacement of blocking native dialogs with React modals.
- Improved UI/UX consistency by using shared `ConfirmDialog`.
- State management is generally clearly separated.
- Clean upgrade of function signatures for dialog usage.
- Correct use of query/mutation invalidation for state refresh.

---

### 7. Final Recommendation

**REQUEST_CHANGES**

- This PR is a substantial quality improvement but **must address critical dialog state leak and error handling issues before merge**.
- **Do not merge until:**
  - State is reset when canceling/closing dialogs
  - Remaining prompts and alerts are migrated from globalThis to proper modals
  - Mutation errors are handled and surfaced to users

Address the above, and this will be a major improvement!

---

**Please notify me when these issues are addressed or for guidance on introducing a PromptDialog or AlertDialog React component.**