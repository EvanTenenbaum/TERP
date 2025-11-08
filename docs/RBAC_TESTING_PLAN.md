# RBAC Testing Plan

This document outlines the comprehensive testing strategy for the RBAC implementation in TERP.

## Testing Phases

### Phase 1: Unit Tests ✅
- [x] Permission service tests
- [x] Permission middleware tests  
- [x] RBAC router tests (created, some mock issues)

### Phase 2: Integration Tests
- [ ] API endpoint protection tests
- [ ] Permission inheritance tests
- [ ] Role assignment tests
- [ ] Permission override tests

### Phase 3: Frontend Tests
- [ ] usePermissions hook tests
- [ ] PermissionGate component tests
- [ ] UI visibility tests

### Phase 4: End-to-End Tests
- [ ] Complete user flows for each role
- [ ] Permission enforcement across modules
- [ ] UI updates based on permissions

### Phase 5: Manual QA
- [ ] Test all 10 roles
- [ ] Verify permission boundaries
- [ ] Test edge cases

### Phase 6: System Smoketest
- [ ] Critical path verification
- [ ] Performance check
- [ ] Security audit

## Test Roles

The following 10 roles should be tested:

1. **Super Admin** - Full system access
2. **Admin** - Administrative access
3. **Manager** - Management functions
4. **Sales Representative** - Sales operations
5. **Inventory Manager** - Inventory control
6. **Accountant** - Financial operations
7. **Purchasing Agent** - Purchase orders
8. **Warehouse Staff** - Warehouse operations
9. **Viewer** - Read-only access
10. **Custom Role** - Mixed permissions

## Test Scenarios

### Scenario 1: API Endpoint Protection

**Test**: Verify all 63 routers enforce permissions

**Steps**:
1. Create test user with limited permissions
2. Attempt to call protected endpoints
3. Verify 403 Forbidden responses
4. Grant permission and retry
5. Verify 200 OK responses

**Expected Results**:
- Unauthorized calls return 403
- Authorized calls return 200
- Super Admin bypasses all checks

### Scenario 2: Role Assignment

**Test**: Assign and remove roles from users

**Steps**:
1. Create test user
2. Assign Sales Representative role
3. Verify user has sales permissions
4. Remove role
5. Verify permissions revoked

**Expected Results**:
- Role assignment updates permissions
- Role removal revokes permissions
- Permission cache clears correctly

### Scenario 3: Permission Overrides

**Test**: Grant and revoke individual permissions

**Steps**:
1. Create user with Viewer role
2. Grant orders:create override
3. Verify user can create orders
4. Revoke override
5. Verify user cannot create orders

**Expected Results**:
- Granted overrides add permissions
- Revoked overrides remove permissions
- Overrides take precedence over role permissions

### Scenario 4: Frontend Visibility

**Test**: UI elements appear/disappear based on permissions

**Steps**:
1. Log in as Sales Representative
2. Verify "Create Order" button visible
3. Verify "Delete Inventory" button hidden
4. Log in as Inventory Manager
5. Verify "Delete Inventory" button visible

**Expected Results**:
- UI updates based on user permissions
- No console errors
- Loading states work correctly

### Scenario 5: Super Admin Bypass

**Test**: Super Admin has access to everything

**Steps**:
1. Log in as Super Admin
2. Access all modules
3. Perform all actions
4. Verify no permission errors

**Expected Results**:
- All UI elements visible
- All API calls succeed
- No permission checks block actions

### Scenario 6: Permission Inheritance

**Test**: Users inherit permissions from multiple roles

**Steps**:
1. Create user with Sales Rep and Inventory Manager roles
2. Verify user has permissions from both roles
3. Remove one role
4. Verify only remaining role's permissions exist

**Expected Results**:
- Multiple roles combine permissions
- Removing role updates permissions correctly

### Scenario 7: Custom Role Creation

**Test**: Create and assign custom roles

**Steps**:
1. Create custom "Sales Manager" role
2. Assign sales and management permissions
3. Assign role to user
4. Verify user has correct permissions

**Expected Results**:
- Custom roles work like system roles
- Permissions assigned correctly
- UI reflects custom role permissions

### Scenario 8: Permission Cache

**Test**: Permission cache clears on changes

**Steps**:
1. User logs in (permissions cached)
2. Admin changes user's role
3. User refreshes page
4. Verify permissions updated

**Expected Results**:
- Cache clears on role change
- New permissions load on refresh
- No stale permission data

### Scenario 9: Concurrent Users

**Test**: Multiple users with different permissions

**Steps**:
1. Log in as Sales Rep in browser 1
2. Log in as Admin in browser 2
3. Perform actions in both browsers
4. Verify permissions enforced independently

**Expected Results**:
- Each user has correct permissions
- No permission leakage between users
- Concurrent access works correctly

### Scenario 10: Error Handling

**Test**: Graceful handling of permission errors

**Steps**:
1. Attempt unauthorized action
2. Verify user-friendly error message
3. Check error logged correctly
4. Verify no system crash

**Expected Results**:
- 403 errors show helpful messages
- Errors logged for debugging
- System remains stable

## Integration Test Examples

### Test: Orders Router Protection

```typescript
describe('Orders Router RBAC', () => {
  it('requires orders:read to list orders', async () => {
    const user = await createTestUser({ permissions: [] });
    const response = await caller(user).orders.getAll();
    expect(response).toThrow('Insufficient permissions');
  });

  it('allows orders:read to list orders', async () => {
    const user = await createTestUser({ permissions: ['orders:read'] });
    const response = await caller(user).orders.getAll();
    expect(response).toBeDefined();
  });

  it('requires orders:create to create orders', async () => {
    const user = await createTestUser({ permissions: ['orders:read'] });
    const response = await caller(user).orders.create({ ... });
    expect(response).toThrow('Insufficient permissions');
  });
});
```

### Test: Permission Service

```typescript
describe('Permission Service', () => {
  it('returns all permissions for Super Admin', async () => {
    const user = await createSuperAdmin();
    const permissions = await getUserPermissions(user.id);
    expect(permissions.length).toBeGreaterThan(100);
  });

  it('combines permissions from multiple roles', async () => {
    const user = await createTestUser({
      roles: ['Sales Representative', 'Inventory Manager']
    });
    const permissions = await getUserPermissions(user.id);
    expect(permissions).toContain('orders:create');
    expect(permissions).toContain('inventory:update');
  });

  it('applies permission overrides correctly', async () => {
    const user = await createTestUser({
      roles: ['Viewer'],
      overrides: [{ permission: 'orders:create', granted: true }]
    });
    const permissions = await getUserPermissions(user.id);
    expect(permissions).toContain('orders:create');
  });
});
```

## Manual QA Checklist

### For Each Role:

- [ ] Log in successfully
- [ ] Dashboard loads with appropriate widgets
- [ ] Navigation menu shows correct items
- [ ] Can access authorized modules
- [ ] Cannot access unauthorized modules
- [ ] Can perform authorized actions
- [ ] Cannot perform unauthorized actions
- [ ] UI elements appear/disappear correctly
- [ ] No console errors
- [ ] No broken functionality

### Specific Checks:

**Super Admin**:
- [ ] Access to Settings > User Roles tab
- [ ] Access to Settings > Roles tab
- [ ] Access to Settings > Permissions tab
- [ ] Can create/edit/delete custom roles
- [ ] Can assign roles to users
- [ ] Can grant permission overrides

**Sales Representative**:
- [ ] Can view clients
- [ ] Can create orders
- [ ] Can view inventory (read-only)
- [ ] Cannot delete orders
- [ ] Cannot access accounting

**Inventory Manager**:
- [ ] Can view inventory
- [ ] Can update inventory
- [ ] Can create products
- [ ] Cannot access accounting
- [ ] Cannot delete clients

**Accountant**:
- [ ] Can view accounting records
- [ ] Can create invoices
- [ ] Cannot delete inventory
- [ ] Cannot create purchase orders

**Viewer**:
- [ ] Can view most modules
- [ ] Cannot create anything
- [ ] Cannot update anything
- [ ] Cannot delete anything
- [ ] All action buttons hidden

## Performance Tests

### Permission Check Performance

**Test**: Measure permission check latency

**Acceptance Criteria**:
- Permission check < 10ms (cached)
- Permission check < 100ms (uncached)
- No N+1 query issues

### Cache Performance

**Test**: Verify permission caching works

**Acceptance Criteria**:
- First check queries database
- Subsequent checks use cache
- Cache invalidates on permission change

## Security Tests

### Authorization Bypass Attempts

**Test**: Try to bypass permission checks

**Attempts**:
- [ ] Direct API calls without auth
- [ ] Modified JWT tokens
- [ ] SQL injection in permission names
- [ ] XSS in role/permission descriptions
- [ ] CSRF on role assignment endpoints

**Expected Results**:
- All bypass attempts fail
- Errors logged appropriately
- No security vulnerabilities

## Regression Tests

After RBAC implementation, verify:

- [ ] Existing features still work
- [ ] No broken user flows
- [ ] Performance not degraded
- [ ] No new console errors
- [ ] Database migrations successful

## Test Data Requirements

### Users
- 1 Super Admin
- 1 user per role (10 total)
- 2 users with multiple roles
- 2 users with permission overrides

### Roles
- 10 system roles (from seed)
- 2-3 custom roles

### Permissions
- All 100+ permissions (from seed)

### Test Scenarios
- 20+ orders
- 50+ inventory items
- 10+ clients
- Sample data for all modules

## Test Execution Plan

### Day 1: Automated Tests
- Run unit tests
- Run integration tests
- Fix any failures
- Achieve 80%+ code coverage

### Day 2: Frontend Tests
- Test usePermissions hook
- Test PermissionGate component
- Test UI visibility
- Fix any issues

### Day 3: Manual QA - Roles 1-5
- Test Super Admin
- Test Admin
- Test Manager
- Test Sales Representative
- Test Inventory Manager

### Day 4: Manual QA - Roles 6-10
- Test Accountant
- Test Purchasing Agent
- Test Warehouse Staff
- Test Viewer
- Test Custom Role

### Day 5: System Tests
- End-to-end user flows
- Performance testing
- Security testing
- Regression testing

### Day 6: Bug Fixes
- Fix critical bugs
- Fix high-priority bugs
- Document known issues

### Day 7: Final Verification
- Retest all critical paths
- Verify all bugs fixed
- System smoketest
- Sign-off

## Success Criteria

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All 10 roles tested manually
- [ ] No critical bugs
- [ ] No high-priority bugs
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Documentation complete

## Known Limitations

Document any known limitations or edge cases:

1. Permission cache TTL is 5 minutes
2. Role changes require page refresh
3. Super Admin cannot be restricted
4. System roles cannot be deleted

## Sign-Off

- [ ] Developer: Implementation complete
- [ ] QA: All tests passed
- [ ] Product Owner: Acceptance criteria met
- [ ] Security: No vulnerabilities found

---

**Test Plan Version**: 1.0  
**Last Updated**: 2025-11-07  
**Status**: Ready for Execution
