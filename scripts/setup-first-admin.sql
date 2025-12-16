-- ================================================================
-- SETUP FIRST ADMIN USER FOR SABIPREP
-- ================================================================
-- 
-- PURPOSE: Promote an existing user to administrator role
-- 
-- ⚠️ SECURITY WARNING: 
-- This script grants full administrative access. Use only during
-- initial setup or when deliberately creating a new admin.
-- 
-- PREREQUISITES:
-- 1. User must already exist in auth.users (signed up through the app)
-- 2. You must have their user ID from Supabase Authentication dashboard
-- 3. Database migrations must be completed (profiles table exists)
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find the user you want to make admin
-- 3. Copy their User ID (UUID format)
-- 4. Replace 'YOUR_USER_ID_HERE' below with the actual ID
-- 5. Execute this script in Supabase SQL Editor
-- 6. Verify the result (should show "Admin user created/updated")
-- 
-- ================================================================

-- Step 1: Replace this with the actual user ID
-- Example: '123e4567-e89b-12d3-a456-426614174000'
DO $$
DECLARE
    target_user_id UUID := 'YOUR_USER_ID_HERE'; -- ⚠️ REPLACE THIS
    user_email TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Check if user ID is still placeholder
    IF target_user_id = 'YOUR_USER_ID_HERE' THEN
        RAISE EXCEPTION 'ERROR: You must replace YOUR_USER_ID_HERE with an actual user ID';
    END IF;

    -- Verify user exists in auth.users
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE id = target_user_id
    ) INTO user_exists;

    IF NOT user_exists THEN
        RAISE EXCEPTION 'ERROR: User with ID % does not exist in auth.users. Please verify the ID.', target_user_id;
    END IF;

    -- Get user email for logging
    SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;

    -- Insert or update profile with admin role
    INSERT INTO profiles (id, email, role, updated_at)
    VALUES (
        target_user_id,
        user_email,
        'admin',
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();

    -- Success message
    RAISE NOTICE 'SUCCESS: User % (%) has been granted admin role', user_email, target_user_id;
    RAISE NOTICE 'The user can now access the admin portal at /admin/login';
END $$;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Run this after the script to verify the admin was created:

-- SELECT 
--     p.id, 
--     p.email, 
--     p.full_name, 
--     p.role, 
--     p.created_at,
--     p.updated_at
-- FROM profiles p
-- WHERE p.role = 'admin'
-- ORDER BY p.created_at DESC;

-- ================================================================
-- ADDITIONAL NOTES
-- ================================================================
-- 
-- Creating Additional Admins:
-- After the first admin is created, additional admins should be 
-- created through the admin portal UI at /admin/users
-- 
-- Removing Admin Access:
-- To revoke admin access, use the admin portal or run:
-- UPDATE profiles SET role = 'student' WHERE id = 'USER_ID_HERE';
-- 
-- Security Best Practices:
-- 1. Limit the number of admin accounts
-- 2. Use strong, unique passwords for admin accounts  
-- 3. Enable 2FA when available
-- 4. Regularly audit admin access logs
-- 5. Remove admin access when no longer needed
-- 
-- Roles in SabiPrep:
-- - student: Default role, access to learning features
-- - tutor: Access to content management (subjects, topics, questions)
-- - admin: Full access to all features including user management
-- 
-- ================================================================
-- TROUBLESHOOTING
-- ================================================================
-- 
-- Error: "User does not exist in auth.users"
-- Solution: User must sign up through the app first. Go to your app's
--          signup page and create an account, then use that account's ID.
-- 
-- Error: "relation profiles does not exist"
-- Solution: Run the database migrations first. The profiles table must
--          exist before running this script.
-- 
-- Error: "duplicate key value violates unique constraint"
-- Solution: Profile already exists. The script will update it automatically,
--          so re-run the script.
-- 
-- Cannot login after running script:
-- Solution: 
-- 1. Clear browser cache and cookies
-- 2. Verify the role was set: SELECT role FROM profiles WHERE id = 'USER_ID';
-- 3. Check middleware is working: Look for any errors in browser console
-- 4. Verify user can login to regular app first
-- 
-- ================================================================
