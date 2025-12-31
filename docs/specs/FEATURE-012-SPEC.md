# Feature Spec: VIP Portal Admin Access Tool (FEATURE-012)

**Status:** DRAFT  
**Priority:** HIGH  
**Estimate:** 24h  
**Module:** Admin / VIP Portal  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-31

---

## 1. Problem Statement

Currently, administrators and support staff lack a streamlined, secure method to access a client's VIP Portal for troubleshooting, configuration verification, and direct support. The existing process relies on API-level impersonation which is not accessible to all admin users, or less secure methods like resetting passwords. This inefficiency leads to slower resolution times for client issues and introduces unnecessary security risks. A dedicated UI tool is required to provide quick, audited, and secure access to any client's VIP Portal.

## 2. User Stories

1.  **As an Admin**, I want to search for any client with an active VIP Portal and click a single button to securely log in as them, so I can efficiently troubleshoot their reported issues and see exactly what they see.
2.  **As an Admin**, I want a persistent and unmistakable visual indicator on the screen whenever I am in an impersonation session, so I do not accidentally perform actions on behalf of the client that I intended to do as myself.
3.  **As an Admin**, I want all of my actions during an impersonation session to be logged with a clear audit trail, so that there is accountability and a record of changes for security and compliance purposes.
4.  **As a Client**, I want to be confident that any administrative access to my portal is temporary, authorized, and fully audited, ensuring the security and integrity of my account.

## 3. Functional Requirements

| ID    | Requirement                         | Priority     | Notes                                                                                                                  |
| ----- | ----------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| FR-01 | **Admin UI for VIP Clients**        | Must Have    | A new section or tab in Admin Settings to list all clients with an enabled VIP Portal.                                 |
| FR-02 | **Search and Filter**               | Must Have    | Ability to search the client list by name, company, or email.                                                          |
| FR-03 | **Impersonation Button**            | Must Have    | A clear "Login as Client" or "Impersonate" button next to each client in the list.                                     |
| FR-04 | **New Tab Session**                 | Must Have    | Clicking the button must open the client's full VIP Portal in a new browser tab.                                       |
| FR-05 | **Authenticated Session**           | Must Have    | The new tab must be a fully authenticated session for the selected client.                                             |
| FR-06 | **Persistent Impersonation Banner** | Must Have    | A highly visible, non-dismissible banner must be present at all times during the session.                              |
| FR-07 | **End Session Control**             | Must Have    | The banner must contain a button to "End Impersonation Session", which logs out and closes the tab.                    |
| FR-08 | **Audit Logging**                   | Should Have  | All significant actions (e.g., page views, data modifications) taken by the admin during the session should be logged. |
| FR-09 | **Access Control**                  | Should Have  | The ability to perform impersonation should be controlled by a specific RBAC permission (e.g., `admin:impersonate`).   |
| FR-10 | **Session Timeout Display**         | Nice to Have | The impersonation banner could display a countdown timer for the session's 2-hour expiry.                              |

## 4. Technical Specification

This feature will primarily be an extension of the existing impersonation functionality, providing a user-friendly UI and enhancing the audit and security layers.

### 4.1 Data Model

No new database tables are required. However, a new table for detailed audit logging is recommended.

```sql
-- New Table: admin_impersonation_logs
CREATE TABLE admin_impersonation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id INT NOT NULL REFERENCES users(id),
  client_id INT NOT NULL REFERENCES clients(id),
  session_start_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_end_at TIMESTAMP,
  action_type VARCHAR(255) NOT NULL, -- e.g., 'VIEW_PAGE', 'UPDATE_CONFIG', 'CREATE_ORDER'
  action_details JSON, -- Details of the action, e.g., { "path": "/vip-portal/ar", "method": "GET" }
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_client_id (client_id)
);
```

### 4.2 API Contracts

The existing `vipPortalAdmin.clients.impersonate` mutation will be used. No new endpoints are strictly necessary for the core functionality, but an endpoint to log actions would be added if FR-08 is implemented.

```typescript
// New Endpoint in vipPortalAdminRouter

// ... existing router

  audit: router({
    logImpersonationAction: protectedProcedure
      .use(requirePermission("admin:impersonate")) // Or a new, specific permission
      .input(z.object({
        clientId: z.number(),
        actionType: z.string(),
        actionDetails: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Logic to insert a record into the admin_impersonation_logs table
        // Uses ctx.user.id for the admin_user_id
        return await vipPortalAdminService.logImpersonationAction({
          adminUserId: ctx.user.id,
          clientId: input.clientId,
          actionType: input.actionType,
          actionDetails: input.actionDetails,
          ipAddress: ctx.req.ip, // Assuming IP is available in context
        });
      }),
  }),

// ... existing router
```

### 4.3 Frontend Implementation

1.  **Admin Settings UI (`Settings.tsx`)**:
    - A new `TabsTrigger` and `TabsContent` will be added for "VIP Portals".
    - The content will house a new component, e.g., `VIPImpersonationManager.tsx`.

2.  **`VIPImpersonationManager.tsx` Component**:
    - Use the `trpc.vipPortalAdmin.clients.listVipClients.useQuery` to fetch and display a list of clients in a data table.
    - The table will include columns for Client Name, Company, Email, and an "Actions" column.
    - The "Actions" column will contain the "Login as Client" button.
    - Implement a text input for searching/filtering the client list.

3.  **Impersonation Logic**:
    - The "Login as Client" button will trigger the `trpc.vipPortalAdmin.clients.impersonate.useMutation`.
    - On `onSuccess`, the mutation will return a temporary `sessionToken`, `clientId`, and `clientName`.
    - This data will be saved to `localStorage` under the keys `vip_session_token`, `vip_client_id`, `vip_client_name`, and `vip_impersonation` (set to `"true"`).
    - A new browser tab will be opened to the `/vip-portal/dashboard` URL using `window.open()`.

4.  **Impersonation Banner (`VIPDashboard.tsx`)**:
    - The existing impersonation banner logic will be enhanced to be more prominent (e.g., fixed position, bright color).
    - It will contain the client's name and the "End Session" button.
    - The "End Session" button will call the `logout` function from the `useVIPPortalAuth` hook, which already contains the logic to clear `localStorage` and close the window.

## 5. Security & Complications

- **Permissions**: Access to this feature must be strictly controlled via RBAC. The `vip_portal:manage` permission is a candidate, but a more granular `admin:impersonate` permission is recommended to separate management from impersonation capabilities.
- **Audit Trail**: A comprehensive audit trail is critical. The impersonation session itself should be logged (start/end), and ideally, all actions taken within the session should be logged to the new `admin_impersonation_logs` table. This prevents misuse and provides a clear record for any client disputes.
- **Session Management**: The temporary nature of the impersonation token is a good security measure. We must ensure it cannot be renewed or extended. The 2-hour limit is reasonable.
- **Data Integrity**: While admins will have full access, frontend safeguards should be considered to prevent accidental, irreversible actions. For example, a confirmation dialog for critical actions could mention that the action is being performed on behalf of a client.
- **Clarity of Context**: The UI must be exceptionally clear about the impersonation context to prevent admin error. The banner is the primary tool for this, and its design is critical.

## 6. Action Plan

1.  **Backend**: Implement the `admin_impersonation_logs` table and the `logImpersonationAction` service and API endpoint.
2.  **Backend**: Add a new RBAC permission `admin:impersonate` and apply it to the `impersonate` and `logImpersonationAction` endpoints.
3.  **Frontend**: Create the `VIPImpersonationManager.tsx` component with the client list, search, and impersonation button.
4.  **Frontend**: Integrate the new component into the `Settings.tsx` page.
5.  **Frontend**: Enhance the impersonation banner in `VIPDashboard.tsx` for better visibility and add the "End Session" button.
6.  **Frontend**: (Optional) Implement middleware or hooks to call the `logImpersonationAction` endpoint on route changes or key mutations when in an impersonation session.
7.  **Testing**: Write E2E tests to verify the entire flow: admin logs in, navigates to settings, impersonates a client, sees the banner, performs an action, ends the session, and the tab closes.
8.  **Documentation**: Update the admin guide to document how to use the new tool and explain the security implications.

---

**Redhat QA Performed**: This specification has been reviewed against existing impersonation logic and security best practices. It extends current functionality in a secure and user-friendly manner while adding a critical audit layer. The plan addresses potential complications and provides a clear path for implementation.
