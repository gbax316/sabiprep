# Admin Portal Deployment Checklist

This checklist ensures a smooth deployment of the SabiPrep Admin Portal to production.

---

## Pre-Deployment Checklist

### 1. Code Verification

- [ ] **Run build test**: `npm run build` completes without errors
- [ ] **TypeScript check**: `npx tsc --noEmit` passes with no errors
- [ ] **Lint check**: `npm run lint` passes or only has acceptable warnings
- [ ] **All files committed**: No uncommitted changes in version control
- [ ] **Branch up to date**: Latest changes pulled from main branch

### 2. Environment Configuration

- [ ] **Production environment variables set**:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
  ```
- [ ] **Environment variables secured**: Never commit `.env.local` to version control
- [ ] **Verify Supabase project**: Using production project (not development)
- [ ] **Domain configured**: Custom domain set up (if applicable)
- [ ] **SSL certificate**: HTTPS enabled

### 3. Database Preparation

- [ ] **Backup existing database**: Take full backup before migration
- [ ] **Review migration files**:
  - `supabase/migrations/20231216_initial_schema.sql`
  - `supabase/migrations/admin_portal_schema.sql`
- [ ] **Test migrations on staging**: Run on test database first
- [ ] **Verify RLS policies**: Row Level Security enabled on all tables
- [ ] **Check foreign keys**: All relationships properly defined
- [ ] **Index optimization**: Appropriate indexes created

### 4. Security Review

- [ ] **Admin routes protected**: Middleware configured correctly
- [ ] **RLS policies active**: Database security enabled
- [ ] **CORS settings**: Configured for production domain
- [ ] **Rate limiting**: Consider implementing (currently not configured)
- [ ] **Audit logging**: Import reports table ready
- [ ] **Secret rotation**: New secrets generated for production

---

## Deployment Steps

### Step 1: Database Migration

#### 1.1 Backup Current Database

```bash
# In Supabase Dashboard:
# 1. Go to Database > Backups
# 2. Create manual backup
# 3. Download backup file
# 4. Store securely
```

#### 1.2 Run Migrations

**Option A: Supabase Dashboard (Recommended)**

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Open `supabase/migrations/20231216_initial_schema.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Execute
7. Verify: Check for success message
8. Repeat for `supabase/migrations/admin_portal_schema.sql`

**Option B: Supabase CLI**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Verify migrations
supabase db status
```

#### 1.3 Verify Tables Created

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles',
  'subjects', 
  'topics',
  'questions',
  'import_reports'
);

-- Should return 5 rows
```

#### 1.4 Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'subjects', 'topics', 'questions');

-- Should show rowsecurity = true for all

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'subjects', 'topics', 'questions');

-- Should return multiple policies
```

### Step 2: Create First Admin User

#### 2.1 Create User Account

1. Navigate to your production app's signup page
2. Register with admin email (e.g., admin@yourdomain.com)
3. Verify email if required
4. Note the user ID from Supabase Dashboard > Authentication

#### 2.2 Promote to Admin

1. Open `scripts/setup-first-admin.sql`
2. Replace `YOUR_USER_ID_HERE` with actual user ID
3. Run in Supabase SQL Editor
4. Verify success message

#### 2.3 Verify Admin Access

```sql
-- Check admin user created
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin';

-- Should show your admin user
```

#### 2.4 Test Admin Login

1. Navigate to `/admin/login`
2. Login with admin credentials
3. Verify access to dashboard
4. Check all menu items accessible

### Step 3: Deploy Application

#### Vercel Deployment (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy admin portal"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select the `sabiprep` repository

3. **Configure Environment Variables**:
   - Click "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Save

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Visit deployed URL

#### Alternative: Manual Deployment

```bash
# Build application
npm run build

# Start production server
npm start

# Or deploy to your hosting platform
# Follow platform-specific instructions
```

### Step 4: Post-Deployment Verification

#### 4.1 Smoke Tests

- [ ] **Homepage loads**: `https://yourdomain.com`
- [ ] **Admin login works**: `https://yourdomain.com/admin/login`
- [ ] **Dashboard displays**: Stats load correctly
- [ ] **User management**: Can view users list
- [ ] **Content management**: Can view subjects/topics
- [ ] **Question bank**: Can view questions
- [ ] **CSV import**: Download template works
- [ ] **Create operations**: Can create new content
- [ ] **Edit operations**: Can update existing content
- [ ] **Delete operations**: Can delete with confirmation

#### 4.2 Security Verification

```bash
# Test unauthorized access
curl https://yourdomain.com/api/admin/dashboard
# Should return 401 Unauthorized

# Test with invalid token
curl -H "Authorization: Bearer invalid-token" \
  https://yourdomain.com/api/admin/dashboard
# Should return 401 Unauthorized

# Test tutor accessing user management
# Login as tutor, try accessing /admin/users
# Should be denied (403 Forbidden)
```

#### 4.3 Database Verification

```sql
-- Check all admin features working
-- After performing various actions in UI

-- Verify data insertion
SELECT COUNT(*) FROM questions;

-- Check import reports created
SELECT COUNT(*) FROM import_reports;

-- Verify RLS working
-- Should only see data user has permission to see
```

#### 4.4 Performance Check

- [ ] **Page load times**: < 3 seconds for admin pages
- [ ] **API response times**: < 1 second for most endpoints
- [ ] **CSV import**: Handles 500+ questions
- [ ] **Database queries**: No slow query warnings

---

## Post-Deployment Tasks

### Immediate (Day 1)

- [ ] **Monitor error logs**: Check for any runtime errors
- [ ] **Test all features**: Complete walkthrough of admin portal
- [ ] **Create test data**: Add sample subjects, topics, questions
- [ ] **Import test CSV**: Verify import functionality works
- [ ] **Security audit**: Review access controls working

### Short-term (Week 1)

- [ ] **Create additional admins**: Promote other admin users
- [ ] **Create tutors**: Set up tutor accounts
- [ ] **Populate content**: Add real subjects and topics
- [ ] **Import questions**: Bulk import question bank
- [ ] **User training**: Train administrators on portal usage
- [ ] **Document setup**: Update internal documentation

### Ongoing

- [ ] **Regular backups**: Schedule daily database backups
- [ ] **Monitor usage**: Track admin portal analytics
- [ ] **Review logs**: Check import reports weekly
- [ ] **Update content**: Regular question bank updates
- [ ] **Security audits**: Monthly access review
- [ ] **Performance monitoring**: Check for slow queries

---

## Rollback Procedures

### If Deployment Fails

#### Option 1: Revert Code

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel will auto-deploy previous version
```

#### Option 2: Restore Database

```sql
-- In Supabase Dashboard:
-- 1. Go to Database > Backups
-- 2. Select backup from before deployment
-- 3. Click "Restore"
-- 4. Confirm restoration

-- Verify restoration
SELECT COUNT(*) FROM questions;
```

#### Option 3: Rollback Migrations

```sql
-- Drop admin portal tables (⚠️ DELETES DATA)
DROP TABLE IF EXISTS import_reports CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- Then restore from backup
```

### If Data Issue Occurs

1. **Stop all imports**: Prevent further data corruption
2. **Identify issue**: Check import reports for errors
3. **Backup current state**: Take snapshot before fixing
4. **Fix data**: Run corrective SQL queries
5. **Verify fix**: Test thoroughly
6. **Resume operations**: Allow imports again

---

## Environment Variables Reference

### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Custom Configuration
# Add any custom environment variables here
```

### Where to Set Them

**Vercel**:
- Dashboard > Project Settings > Environment Variables
- Set for Production, Preview, and Development

**Netlify**:
- Site Settings > Build & Deploy > Environment Variables

**Self-Hosted**:
- Create `.env.production.local` file
- Never commit to version control

---

## Troubleshooting Deployment

### Build Fails

**Error**: TypeScript errors during build

**Solution**:
```bash
# Check locally first
npx tsc --noEmit

# Fix all TypeScript errors
# Then rebuild
npm run build
```

### Database Connection Fails

**Error**: "Could not connect to database"

**Solution**:
1. Verify Supabase URL is correct
2. Check anon key is valid
3. Ensure project is not paused
4. Verify network connectivity

### Migration Fails

**Error**: "Relation already exists"

**Solution**:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- If tables exist, either:
-- A) Skip migration (tables already created)
-- B) Drop and recreate (⚠️ loses data)
```

### Admin Login Fails

**Error**: "User is not an admin"

**Solution**:
```sql
-- Check user's role
SELECT id, email, role FROM profiles 
WHERE email = 'admin@example.com';

-- If role is not 'admin', update:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### RLS Blocks Operations

**Error**: "Permission denied for table"

**Solution**:
```sql
-- Verify RLS policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'questions';

-- If missing, run migration again
-- Or manually create policies
```

### CSV Import Fails

**Error**: Various import errors

**Solution**:
1. Download fresh template
2. Verify subject/topic IDs exist
3. Check all required fields filled
4. Validate file format (UTF-8 CSV)
5. Try with smaller batch first

---

## Monitoring and Maintenance

### Daily Checks

- [ ] Review error logs in hosting platform
- [ ] Check database backup completed
- [ ] Monitor API response times
- [ ] Review failed import reports

### Weekly Checks

- [ ] Review user activity statistics
- [ ] Check for low-content topics
- [ ] Review import success rates
- [ ] Update content as needed

### Monthly Checks

- [ ] Security audit (review admin access)
- [ ] Performance optimization
- [ ] Database cleanup ( deleted records)
- [ ] Dependency updates
- [ ] Review and update documentation

### Metrics to Track

**Usage Metrics**:
- Number of active admins/tutors
- Questions added per week
- CSV imports per month
- User management actions

**Performance Metrics**:
- Average API response time
- Page load times
- Database query performance
- Failed import rate

**Security Metrics**:
- Failed login attempts
- Unauthorized access attempts
- Admin action audit trail

---

## Support Contacts

**Technical Issues**:
- Development Team: dev@yourdomain.com
- System Admin: sysadmin@yourdomain.com

**Database Issues**:
- Supabase Support: https://supabase.com/support
- Database Admin: dba@yourdomain.com

**Hosting Issues**:
- Vercel Support: https://vercel.com/support
- DevOps Team: devops@yourdomain.com

---

## Additional Resources

- [ADMIN_PORTAL_README.md](./ADMIN_PORTAL_README.md) - Complete admin documentation
- [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) - CSV import instructions
- [API_REFERENCE.md](./API_REFERENCE.md) - API endpoint documentation
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - General deployment guide
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration

---

## Deployment Completion Checklist

Final verification before marking deployment complete:

### Pre-Go-Live

- [ ] All pre-deployment checks passed
- [ ] Database migrated successfully
- [ ] First admin user created
- [ ] Application deployed to production
- [ ] Environment variables configured
- [ ] SSL/HTTPS working
- [ ] Custom domain configured (if applicable)

### Post-Go-Live

- [ ] All smoke tests passed
- [ ] Security verification completed
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Backup system verified
- [ ] Rollback plan tested
- [ ] Team trained on admin portal
- [ ] Documentation updated

### Sign-Off

- [ ] **Deployed By**: ___________________ Date: ___________
- [ ] **Verified By**: ___________________ Date: ___________
- [ ] **Approved By**: ___________________ Date: ___________

---

**Deployment Version**: 1.0.0  
**Last Updated**: December 2024  
**Next Review**: After first production month

---

*For questions or issues during deployment, refer to the troubleshooting section or contact the development team.*
