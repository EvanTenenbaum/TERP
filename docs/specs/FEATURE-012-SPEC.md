# Feature Spec: VIP Portal Admin Access Tool (FEATURE-012)

**Status:** REVISED DRAFT  
**Priority:** HIGH  
**Estimate:** 32h (Updated)  
**Module:** Admin / VIP Portal  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-31 (Revised)

---

## 1. Problem Statement

Administrators and support staff lack a streamlined, secure method to access a client's VIP Portal for troubleshooting and support. The existing process relies on a basic, non-audited impersonation feature on individual client pages or less secure methods like password resets. This inefficiency leads to slower resolution times and introduces unnecessary security and compliance risks. A centralized, audited, and secure UI tool is required.

## 2. User Stories

1.  **As an Admin**, I want a centralized tool to search for any client and click a single button to securely log in as them, so I can efficiently troubleshoot their reported issues.
2.  **As an Admin**, I want a persistent, unmistakable visual indicator whenever I am in an impersonation session, so I do not accidentally perform actions on behalf of the client.
3.  **As an Admin**, I want all of my actions during an impersonation session to be logged with a clear audit trail, so there is accountability and a record of changes for security and compliance purposes.
4.  **As a Client**, I want to be confident that any administrative access to my portal is temporary, authorized, and fully audited, ensuring the security and integrity of my account.

## 3. Functional Requirements (Revised)

| ID    | Requirement                         | Priority    | Notes                                                                                                                                                               |
| ----- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | **Centralized Admin UI**            | Must Have   | A new "VIP Portal Access" tab in Admin Settings to list all clients with an enabled VIP Portal. This will deprecate the existing button on the client profile page. |
| FR-02 | **Search and Filter**               | Must Have   | Ability to search the client list by name, company, or email.                                                                                                       |
| FR-03 | **Confirmation Dialog**             | Must Have   | Before impersonating, a dialog must confirm the action: "You are about to view the portal as [Client Name]. All actions will be logged. Continue?"                  |
| FR-04 | **Secure Session Creation**         | Must Have   | Clicking "Continue" must open the client's portal in a new tab with a secure, one-time-use token.                                                                   |
| FR-05 | **Persistent Impersonation Banner** | Must Have   | A highly visible, fixed-position, non-dismissible banner (e.g., bright red) must be present at all times.                                                           |
| FR-06 | **End Session Control**             | Must Have   | The banner must contain an "End Impersonation" button that fully logs the user out and closes the tab.                                                              |
| FR-07 | **Comprehensive Audit Logging**     | Must Have   | All impersonation sessions (start, end, admin, client) and all significant actions within the session must be logged.                                               |
| FR-08 | **Granular Access Control**         | Must Have   | Impersonation ability must be controlled by a new `admin:impersonate` RBAC permission.                                                                              |
| FR-09 | **Server-Side Session Revocation**  | Should Have | A super-admin should be able to view and revoke active impersonation sessions.                                                                                      |
| FR-10 | **Client Notification**             | Should Have | An email or in-portal notification should be sent to the client when an admin accesses their portal.                                                                |

## 4. Technical Specification (Revised)

### 4.1 Data Model (Revised)

Two new tables are required to properly track sessions and actions.

```sql
-- New Table: admin_impersonation_sessions
CREATE TABLE admin_impersonation_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_guid VARCHAR(36) NOT NULL UNIQUE,
  admin_user_id INT NOT NULL REFERENCES users(id),
  client_id INT NOT NULL REFERENCES clients(id),
  start_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_at TIMESTAMP,
  ip_address VARCHAR(45),
  status ENUM('ACTIVE', 'ENDED', 'REVOKED') DEFAULT 'ACTIVE',
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_client_id (client_id)
);

-- New Table: admin_impersonation_actions
CREATE TABLE admin_impersonation_actions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL REFERENCES admin_impersonation_sessions(id),
  action_type VARCHAR(255) NOT NULL, -- e.g., 'VIEW_PAGE', 'UPDATE_CONFIG'
  action_details JSON, -- e.g., { "path": "/vip-portal/ar", "method": "GET" }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts (Revised)

1.  **`vipPortalAdmin.clients.impersonate` (Mutation)**: This will now create a record in `admin_impersonation_sessions` and return a one-time-use `impersonationToken`.
2.  **`vipPortal.auth.startImpersonationSession` (Mutation)**: A new public endpoint that accepts the `impersonationToken`, validates it, and returns a standard `sessionToken` for the VIP portal, which will be stored in **`sessionStorage`**.
3.  **`vipPortalAdmin.audit.logImpersonationAction` (Mutation)**: Logs an action to the `admin_impersonation_actions` table. It will take the impersonation `sessionToken` to identify the session.
4.  **`vipPortalAdmin.audit.endImpersonationSession` (Mutation)**: Updates the session record to `ENDED`.
5.  **`vipPortalAdmin.audit.revokeImpersonationSession` (Mutation)**: Allows a super-admin to set a session status to `REVOKED`.

### 4.3 Frontend Implementation (Revised)

1.  **`VIPImpersonationManager.tsx` Component**:
    - This new component will be the single source of truth for initiating impersonation.
    - It will display a list of VIP clients and include a search bar.
    - The "Login as Client" button will first show a confirmation dialog.
    - On confirmation, it calls the `impersonate` mutation.
    - On success, it receives a one-time `impersonationToken` and opens a new tab with a URL like `/vip-portal/auth/impersonate?token=XYZ`.

2.  **`VIPPortalSettings.tsx` (Deprecation)**:
    - The existing "View as Client" button on the individual client profile page will be removed to centralize the feature.

3.  **`VIPImpersonationAuthPage.tsx` (New Page)**:
    - A new page at `/vip-portal/auth/impersonate` will handle the token exchange.
    - It will call the `startImpersonationSession` mutation with the token from the URL.
    - On success, it will store the returned `sessionToken` and other details in **`sessionStorage`** (not `localStorage`) and redirect to the dashboard.

4.  **Impersonation Banner (`VIPDashboard.tsx`)**:
    - The banner will be styled to be fixed at the top of the viewport with a high-contrast background (e.g., red).
    - The "End Session" button will now call the full `logout` function from the `useVIPPortalAuth` hook, which must be updated to also call the `endImpersonationSession` mutation.

## 5. Security & Complications (Revised)

- **Permissions**: Access is now controlled by a mandatory `admin:impersonate` permission.
- **Audit Trail**: Now a "Must Have" requirement with a robust two-table data model.
- **Session Management**: Sessions are now tracked server-side and can be revoked. The use of `sessionStorage` prevents cross-tab conflicts and ensures impersonation is isolated to a single tab.
- **Data Integrity**: Confirmation dialogs are now required before initiating a session and are recommended for critical actions within the session.
- **Popup Blockers**: The `window.open` call is a direct result of a user click, which is unlikely to be blocked. A fallback link can be added if necessary.
- **Client Notification**: A `Should Have` requirement to send an email to the client upon session start, increasing transparency.

## 6. Action Plan (Revised)

1.  **Backend**: Implement the `admin_impersonation_sessions` and `admin_impersonation_actions` tables.
2.  **Backend**: Create the new RBAC permission `admin:impersonate`.
3.  **Backend**: Update the `impersonate` mutation and create the new `startImpersonationSession`, `logImpersonationAction`, and `endImpersonationSession` endpoints.
4.  **Frontend**: Create the centralized `VIPImpersonationManager.tsx` component and integrate it into `Settings.tsx`.
5.  **Frontend**: Remove the old impersonation button from `VIPPortalSettings.tsx`.
6.  **Frontend**: Create the new `VIPImpersonationAuthPage.tsx` to handle the secure token exchange.
7.  **Frontend**: Update the `useVIPPortalAuth` hook to use `sessionStorage` and call the new `endImpersonationSession` endpoint on logout.
8.  **Frontend**: Restyle the impersonation banner to be fixed and high-contrast.
9.  **Testing**: Write E2E tests covering the new flow, including multi-tab scenarios and session revocation.
10. **Documentation**: Update admin guides.

---

**Redhat QA Performed**: This revised specification incorporates findings from a comprehensive third-party review. It addresses critical security flaws (session management, audit logging, `localStorage` misuse), improves user experience, and provides a more robust and compliant implementation plan.
