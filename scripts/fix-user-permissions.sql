-- Fix User Permissions for BUG-001
-- This script checks if user "Evan" has the "orders:read" permission
-- and makes them a Super Admin if they don't.

-- Step 1: Find user "Evan"
SELECT 
    id,
    open_id,
    username,
    email,
    is_super_admin
FROM users
WHERE email LIKE '%Evan%' OR username LIKE '%Evan%';

-- Step 2: Check if user is already a Super Admin
-- If is_super_admin = 1, then permissions are NOT the issue

-- Step 3: Make user "Evan" a Super Admin
-- IMPORTANT: Replace <USER_ID> with the actual ID from Step 1
-- UPDATE users SET is_super_admin = 1 WHERE id = <USER_ID>;

-- Example (uncomment and replace ID):
-- UPDATE users SET is_super_admin = 1 WHERE id = 1;

-- Step 4: Verify the change
-- SELECT id, username, email, is_super_admin FROM users WHERE id = <USER_ID>;
