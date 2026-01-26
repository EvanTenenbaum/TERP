# QA-044: Event Invitation Workflow - Test Plan

**Task:** QA-044 - Event Invitation Workflow  
**Date:** 2024-11-14  
**Status:** Ready for Testing

---

## 1. Test Environment Setup

### Prerequisites

- Database migration `0036_add_event_invitations.sql` applied
- Backend server running with updated routers
- Frontend client with new invitation components
- Test users, clients, and events created

### Test Data Requirements

- At least 5 test users with different roles
- At least 3 test clients
- At least 2 test events (one past, one future)
- Various invitation statuses represented

---

## 2. Backend API Testing

### 2.1 Create Invitation Tests

**Test Case 2.1.1: Create USER Invitation**

- **Endpoint:** `calendarInvitations.createInvitation`
- **Input:** `{ eventId, inviteeType: "USER", userId, role: "REQUIRED" }`
- **Expected:** Invitation created with status "DRAFT"
- **Verify:** Auto-accept checked based on user settings

**Test Case 2.1.2: Create CLIENT Invitation**

- **Endpoint:** `calendarInvitations.createInvitation`
- **Input:** `{ eventId, inviteeType: "CLIENT", clientId, role: "OPTIONAL" }`
- **Expected:** Invitation created successfully

**Test Case 2.1.3: Create EXTERNAL Invitation**

- **Endpoint:** `calendarInvitations.createInvitation`
- **Input:** `{ eventId, inviteeType: "EXTERNAL", externalEmail, externalName, role: "OBSERVER" }`
- **Expected:** Invitation created successfully

**Test Case 2.1.4: Prevent Duplicate Invitations**

- **Input:** Create same invitation twice
- **Expected:** Second attempt throws error

**Test Case 2.1.5: Permission Check**

- **Input:** User without EDIT permission tries to create invitation
- **Expected:** Permission denied error

### 2.2 Send Invitation Tests

**Test Case 2.2.1: Send Normal Invitation**

- **Endpoint:** `calendarInvitations.sendInvitation`
- **Input:** `{ invitationId }` (no auto-accept)
- **Expected:** Status changes to "PENDING", sentAt timestamp set
- **Verify:** History record created with action "SENT"

**Test Case 2.2.2: Auto-Accept Invitation**

- **Setup:** User has autoAcceptAll = true
- **Expected:** Status changes to "AUTO_ACCEPTED", participant created
- **Verify:** History record with action "AUTO_ACCEPTED"

**Test Case 2.2.3: Cannot Send Non-Draft**

- **Input:** Try to send invitation with status "PENDING"
- **Expected:** Error thrown

### 2.3 Respond to Invitation Tests

**Test Case 2.3.1: Accept Invitation**

- **Endpoint:** `calendarInvitations.respondToInvitation`
- **Input:** `{ invitationId, response: "ACCEPTED" }`
- **Expected:** Status "ACCEPTED", participant created, respondedAt set
- **Verify:** Participant has correct role and responseStatus

**Test Case 2.3.2: Decline Invitation**

- **Input:** `{ invitationId, response: "DECLINED" }`
- **Expected:** Status "DECLINED", no participant created

**Test Case 2.3.3: Wrong User Responds**

- **Input:** User B tries to respond to User A's invitation
- **Expected:** Permission denied error

**Test Case 2.3.4: Respond to Non-Pending**

- **Input:** Try to respond to "DRAFT" invitation
- **Expected:** Error thrown

### 2.4 Invitation Settings Tests

**Test Case 2.4.1: Get Default Settings**

- **Endpoint:** `calendarInvitations.getInvitationSettings`
- **Expected:** Default settings created if none exist
- **Verify:** autoAcceptAll = false, notifyOnInvitation = true

**Test Case 2.4.2: Update Settings**

- **Endpoint:** `calendarInvitations.updateInvitationSettings`
- **Input:** `{ autoAcceptAll: true, notifyOnAutoAccept: false }`
- **Expected:** Settings updated successfully

**Test Case 2.4.3: Auto-Accept from Organizer**

- **Setup:** User has autoAcceptFromOrganizers = [organizerId]
- **Expected:** Invitation from that organizer has autoAccept = true

**Test Case 2.4.4: Auto-Accept by Event Type**

- **Setup:** User has autoAcceptByEventType = ["MEETING"]
- **Expected:** MEETING invitations have autoAccept = true

**Test Case 2.4.5: Auto-Accept by Module**

- **Setup:** User has autoAcceptByModule = ["SALES"]
- **Expected:** SALES module invitations have autoAccept = true

### 2.5 Admin Override Tests

**Test Case 2.5.1: Admin Accept Override**

- **Endpoint:** `calendarInvitations.adminOverrideInvitation`
- **Input:** `{ invitationId, action: "ACCEPT", reason }`
- **Expected:** Status "ACCEPTED", adminOverride = true, participant created
- **Verify:** overriddenBy, overrideReason, overriddenAt set

**Test Case 2.5.2: Admin Decline Override**

- **Input:** `{ invitationId, action: "DECLINE", reason }`
- **Expected:** Status "DECLINED", adminOverride = true

**Test Case 2.5.3: Admin Cancel Override**

- **Input:** `{ invitationId, action: "CANCEL", reason }`
- **Expected:** Status "CANCELLED", adminOverride = true

**Test Case 2.5.4: Non-Admin Override Attempt**

- **Input:** Regular user tries admin override
- **Expected:** Permission denied error

### 2.6 Query Tests

**Test Case 2.6.1: Get Invitations by Event**

- **Endpoint:** `calendarInvitations.getInvitationsByEvent`
- **Input:** `{ eventId }`
- **Expected:** All invitations for event returned
- **Verify:** Permission check applied

**Test Case 2.6.2: Get Pending Invitations**

- **Endpoint:** `calendarInvitations.getPendingInvitations`
- **Expected:** Only user's pending invitations returned

**Test Case 2.6.3: Get Invitation History**

- **Endpoint:** `calendarInvitations.getInvitationHistory`
- **Input:** `{ invitationId }`
- **Expected:** Complete audit trail returned
- **Verify:** Actions in chronological order

### 2.7 Bulk Operations Tests

**Test Case 2.7.1: Bulk Send Success**

- **Endpoint:** `calendarInvitations.bulkSendInvitations`
- **Input:** `{ eventId, invitees: [user1, user2, client1], message }`
- **Expected:** All invitations sent successfully
- **Verify:** sent count = 3, failed count = 0

**Test Case 2.7.2: Bulk Send Partial Failure**

- **Input:** Mix of valid and invalid invitees
- **Expected:** Valid invitations sent, failed count > 0

**Test Case 2.7.3: Bulk Send with Auto-Accept**

- **Setup:** Some users have auto-accept enabled
- **Expected:** Those invitations auto-accepted, others pending

### 2.8 Cancel Invitation Tests

**Test Case 2.8.1: Cancel Pending Invitation**

- **Endpoint:** `calendarInvitations.cancelInvitation`
- **Input:** `{ invitationId }`
- **Expected:** Status changed to "CANCELLED"
- **Verify:** History record created

**Test Case 2.8.2: Permission Check for Cancel**

- **Input:** User without EDIT permission tries to cancel
- **Expected:** Permission denied error

---

## 3. Frontend UI Testing

### 3.1 InvitationStatusBadge Component

**Test Case 3.1.1: Display All Statuses**

- **Action:** Render badge for each status
- **Expected:** Correct color, icon, and label for each

**Test Case 3.1.2: Size Variants**

- **Action:** Render with size="sm", "md", "lg"
- **Expected:** Correct sizing applied

### 3.2 EventInvitationDialog Component

**Test Case 3.2.1: Open Dialog**

- **Action:** Click "Send Invitations" button
- **Expected:** Dialog opens with event title

**Test Case 3.2.2: Add USER Invitee**

- **Action:** Select USER type, choose user, select role, click "Add to List"
- **Expected:** User added to invitees list

**Test Case 3.2.3: Add CLIENT Invitee**

- **Action:** Select CLIENT type, choose client, click "Add to List"
- **Expected:** Client added to invitees list

**Test Case 3.2.4: Add EXTERNAL Invitee**

- **Action:** Select EXTERNAL type, enter email and name, click "Add to List"
- **Expected:** External contact added to invitees list

**Test Case 3.2.5: Remove Invitee**

- **Action:** Click X button on invitee
- **Expected:** Invitee removed from list

**Test Case 3.2.6: Send Invitations**

- **Action:** Add multiple invitees, enter message, click "Send Invitations"
- **Expected:** Success message, dialog closes, invitations sent

**Test Case 3.2.7: View Existing Invitations**

- **Action:** Open dialog for event with existing invitations
- **Expected:** Existing invitations displayed with status badges

**Test Case 3.2.8: Validation**

- **Action:** Try to send without adding invitees
- **Expected:** Error message displayed

### 3.3 PendingInvitationsWidget Component

**Test Case 3.3.1: Display Pending Invitations**

- **Action:** View widget with pending invitations
- **Expected:** All pending invitations listed with details

**Test Case 3.3.2: Accept Invitation**

- **Action:** Click "Accept" button
- **Expected:** Invitation accepted, widget refreshed

**Test Case 3.3.3: Decline Invitation**

- **Action:** Click "Decline" button
- **Expected:** Invitation declined, widget refreshed

**Test Case 3.3.4: Empty State**

- **Action:** View widget with no pending invitations
- **Expected:** "No pending invitations" message displayed

**Test Case 3.3.5: Loading State**

- **Action:** Observe during accept/decline
- **Expected:** Buttons disabled, loading indicator shown

### 3.4 InvitationSettingsDialog Component

**Test Case 3.4.1: Open Settings**

- **Action:** Open invitation settings dialog
- **Expected:** Current settings loaded and displayed

**Test Case 3.4.2: Toggle Auto-Accept All**

- **Action:** Check "Auto-accept all invitations"
- **Expected:** Other auto-accept options hidden

**Test Case 3.4.3: Select Organizers**

- **Action:** Check specific organizers for auto-accept
- **Expected:** Selected organizers highlighted

**Test Case 3.4.4: Select Event Types**

- **Action:** Check specific event types
- **Expected:** Selected types highlighted

**Test Case 3.4.5: Select Modules**

- **Action:** Check specific modules
- **Expected:** Selected modules highlighted

**Test Case 3.4.6: Toggle Notifications**

- **Action:** Toggle notification preferences
- **Expected:** Checkboxes update correctly

**Test Case 3.4.7: Save Settings**

- **Action:** Make changes and click "Save Settings"
- **Expected:** Success message, settings saved, dialog closes

**Test Case 3.4.8: Cancel Changes**

- **Action:** Make changes and click "Cancel"
- **Expected:** Changes discarded, dialog closes

---

## 4. Integration Testing

### 4.1 End-to-End Invitation Flow

**Test Case 4.1.1: Complete Invitation Lifecycle**

1. Organizer creates event
2. Organizer opens invitation dialog
3. Organizer adds 3 invitees (USER, CLIENT, EXTERNAL)
4. Organizer sends invitations
5. User receives invitation in pending widget
6. User accepts invitation
7. Participant created and visible in event
8. **Expected:** Complete flow works seamlessly

**Test Case 4.1.2: Auto-Accept Flow**

1. User enables auto-accept all
2. Organizer sends invitation to user
3. **Expected:** Invitation auto-accepted, participant created immediately

**Test Case 4.1.3: Admin Override Flow**

1. User declines invitation
2. Admin overrides to accept with reason
3. **Expected:** Invitation accepted, participant created, audit trail complete

### 4.2 Calendar Integration

**Test Case 4.2.1: View Invitations from Event**

- **Action:** Open event details, view invitations tab
- **Expected:** All invitations displayed with statuses

**Test Case 4.2.2: Participant Sync**

- **Action:** Accept invitation
- **Expected:** Participant appears in event participants list

**Test Case 4.2.3: Event Deletion Cascade**

- **Action:** Delete event with invitations
- **Expected:** All invitations deleted (cascade)

### 4.3 Permission Integration

**Test Case 4.3.1: View Permission**

- **Action:** User with VIEW permission tries to see invitations
- **Expected:** Can view, cannot create/send

**Test Case 4.3.2: Edit Permission**

- **Action:** User with EDIT permission manages invitations
- **Expected:** Can create, send, cancel invitations

**Test Case 4.3.3: Admin Permission**

- **Action:** Admin uses override functionality
- **Expected:** Can override any invitation

---

## 5. Performance Testing

### 5.1 Bulk Operations

**Test Case 5.1.1: Bulk Send 100 Invitations**

- **Action:** Send invitations to 100 users
- **Expected:** Completes in < 5 seconds

**Test Case 5.1.2: Query Large Event**

- **Action:** Query invitations for event with 500 invitations
- **Expected:** Results returned in < 1 second

### 5.2 Database Performance

**Test Case 5.2.1: Index Effectiveness**

- **Action:** Query invitations by various filters
- **Expected:** All queries use appropriate indexes

**Test Case 5.2.2: History Table Growth**

- **Action:** Create 1000 invitation actions
- **Expected:** No performance degradation

---

## 6. Security Testing

### 6.1 Authorization

**Test Case 6.1.1: Cross-User Access**

- **Action:** User A tries to respond to User B's invitation
- **Expected:** Access denied

**Test Case 6.1.2: Event Permission Enforcement**

- **Action:** User without event access tries to create invitation
- **Expected:** Permission denied

### 6.2 Input Validation

**Test Case 6.2.1: Email Validation**

- **Action:** Try to create EXTERNAL invitation with invalid email
- **Expected:** Validation error

**Test Case 6.2.2: SQL Injection Prevention**

- **Action:** Try SQL injection in message field
- **Expected:** Input sanitized, no SQL execution

---

## 7. Error Handling Testing

### 7.1 Network Errors

**Test Case 7.1.1: API Timeout**

- **Action:** Simulate slow network during send
- **Expected:** Appropriate error message, retry option

**Test Case 7.1.2: Connection Loss**

- **Action:** Disconnect during bulk send
- **Expected:** Partial success handled gracefully

### 7.2 Data Validation Errors

**Test Case 7.2.1: Missing Required Fields**

- **Action:** Try to create invitation without required fields
- **Expected:** Clear validation error messages

**Test Case 7.2.2: Invalid Foreign Keys**

- **Action:** Try to create invitation for non-existent event
- **Expected:** Appropriate error message

---

## 8. Accessibility Testing

### 8.1 Keyboard Navigation

**Test Case 8.1.1: Dialog Navigation**

- **Action:** Navigate invitation dialog using only keyboard
- **Expected:** All interactive elements accessible

**Test Case 8.1.2: Widget Navigation**

- **Action:** Navigate pending invitations widget with keyboard
- **Expected:** Accept/Decline buttons accessible

### 8.2 Screen Reader Support

**Test Case 8.2.1: Status Badges**

- **Action:** Use screen reader on status badges
- **Expected:** Status announced clearly

**Test Case 8.2.2: Form Labels**

- **Action:** Use screen reader on invitation form
- **Expected:** All fields properly labeled

---

## 9. Browser Compatibility Testing

### 9.1 Desktop Browsers

- **Chrome:** Latest version
- **Firefox:** Latest version
- **Safari:** Latest version
- **Edge:** Latest version

### 9.2 Mobile Browsers

- **iOS Safari:** Latest version
- **Android Chrome:** Latest version

---

## 10. Regression Testing

### 10.1 Existing Calendar Features

**Test Case 10.1.1: Event Creation**

- **Action:** Create new event
- **Expected:** Works as before

**Test Case 10.1.2: Participant Management**

- **Action:** Add/remove participants directly
- **Expected:** Works independently of invitations

**Test Case 10.1.3: Event Editing**

- **Action:** Edit event details
- **Expected:** No impact on invitations

---

## 11. Test Execution Checklist

- [ ] Database migration applied successfully
- [ ] All backend unit tests pass
- [ ] All backend API tests pass
- [ ] All frontend component tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] Accessibility tests pass
- [ ] Browser compatibility verified
- [ ] Regression tests pass
- [ ] Documentation reviewed
- [ ] Code review completed

---

## 12. Known Issues and Limitations

### Current Limitations

1. External email invitations do not send actual emails (in-app only)
2. No email notification system integrated yet
3. Invitation expiration not automatically enforced

### Future Enhancements

1. Email integration for external invitations
2. Automatic expiration handling
3. Invitation templates
4. Recurring event invitation handling

---

## 13. Sign-Off

**QA Engineer:** **\*\*\*\***\_**\*\*\*\***  
**Date:** **\*\*\*\***\_**\*\*\*\***

**Product Owner:** **\*\*\*\***\_**\*\*\*\***  
**Date:** **\*\*\*\***\_**\*\*\*\***

**Technical Lead:** **\*\*\*\***\_**\*\*\*\***  
**Date:** **\*\*\*\***\_**\*\*\*\***
