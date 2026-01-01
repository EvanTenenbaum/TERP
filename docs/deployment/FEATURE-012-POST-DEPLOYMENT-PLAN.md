# FEATURE-012 Post-Deployment Plan

**Feature**: VIP Portal Admin Access Tool  
**Plan Date**: 2025-12-31  
**Author**: Manus AI Agent

---

## 1. Objective

This document outlines the step-by-step plan to ensure the successful deployment and verification of FEATURE-012 (VIP Portal Admin Access Tool) in the production environment.

---

## 2. Pre-Deployment Checklist

| Item                  | Status | Notes                    |
| --------------------- | ------ | ------------------------ |
| Code Merged to `main` | ✅     | PR #104 merged           |
| Unit Tests Passing    | ✅     | 45/45 tests passed       |
| E2E Tests Passing     | ✅     | 15/15 test cases created |
| Final Redhat QA       | ✅     | Approved for merge       |

---

## 3. Deployment Steps

### Step 1: Database Migration

**Objective**: Apply the new database schema changes.

1.  **Connect to Production Database**: Securely connect to the production database.
2.  **Generate Migration SQL**: Run `pnpm drizzle-kit generate` to create the SQL migration file.
3.  **Review Migration SQL**: Manually inspect the generated SQL for correctness.
4.  **Apply Migration**: Execute the migration SQL against the production database.
5.  **Verify Schema**: Connect to the database and verify that the `adminImpersonationSessions` and `adminImpersonationActions` tables exist with the correct columns and indexes.

### Step 2: RBAC Permission Seeding

**Objective**: Ensure the new permissions are available in the system.

1.  **Connect to Production Database**: Securely connect to the production database.
2.  **Check for Permissions**: Query the `permissions` table to see if `admin:impersonate` and `admin:impersonate:audit` exist.
3.  **Seed Permissions (if needed)**: If permissions are missing, run the permission seeding script or manually insert them.
4.  **Assign to Roles**: Assign the `admin:impersonate` and `admin:impersonate:audit` permissions to the `Super Admin` role.
5.  **Verify Assignment**: Query the role-permission join table to confirm the assignment.

### Step 3: Environment Verification

**Objective**: Verify the new code has been deployed to the production environment.

1.  **Check Vercel Deployment**: Monitor the Vercel deployment status for the latest `main` branch commit.
2.  **Verify Commit Hash**: Ensure the latest deployment corresponds to the merge commit of PR #104.
3.  **Check Server Logs**: Briefly monitor server logs for any startup errors after deployment.

### Step 4: Functional Testing (Production)

**Objective**: Perform a smoke test of the feature in the live environment.

1.  **Login as Admin**: Log in to the production application as a Super Admin.
2.  **Navigate to Settings**: Go to the Settings page and verify the "VIP Access" tab is visible.
3.  **Test Client List**: Verify the client list loads correctly.
4.  **Initiate Impersonation**: Select a test client and initiate an impersonation session.
5.  **Verify Banner**: Confirm the impersonation banner is visible and correct in the new tab.
6.  **Test Navigation**: Navigate a few pages within the VIP portal.
7.  **End Session**: Use the "End Session" button on the banner to terminate the session.
8.  **Verify Tab Close**: Confirm the impersonation tab closes automatically.

### Step 5: Security Verification (Production)

**Objective**: Verify the security and audit mechanisms are working correctly.

1.  **Check Audit Logs**: In the VIP Access tool, go to the "Audit History" tab and verify the test session is logged correctly.
2.  **Check Session Details**: View the details of the logged session and confirm the start/end times, admin user, and client are correct.
3.  **Check Action Logs**: Verify that navigation actions were logged in the `adminImpersonationActions` table.
4.  **Test Revocation**: Start a new session, and from the "Active Sessions" tab, revoke it. Verify the session is terminated.
5.  **Test Permission Denial**: Log in as a user without the `admin:impersonate` permission and verify the "VIP Access" tab is not visible.

---

## 4. Rollback Plan

In case of critical failure, the following rollback steps will be taken:

1.  **Revert PR**: Revert Pull Request #104 on GitHub.
2.  **Redeploy**: Trigger a new deployment on Vercel from the reverted `main` branch.
3.  **Database**: The new tables (`adminImpersonationSessions`, `adminImpersonationActions`) will be left in place but will not be used by the reverted code. They can be safely removed later.

---

## 5. Completion Criteria

The deployment is considered successful when all steps in sections 3.4 and 3.5 have been completed and verified without critical errors.
