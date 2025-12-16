# SabiPrep Admin Portal Documentation

## Overview

The SabiPrep Admin Portal is a comprehensive content management system designed for administrators and tutors to manage the platform's educational content, users, and question bank.

### Who Can Access

- **Administrators**: Full access to all features including user management, content management, and system configuration
- **Tutors**: Limited access to content management features (subjects, topics, questions)

### Key Features

1. **Dashboard**: Real-time statistics and system alerts
2. **User Management**: Create, edit, and manage user accounts and roles
3. **Content Management**: Organize subjects and topics hierarchically
4. **Question Bank**: Comprehensive CRUD operations for practice questions
5. **CSV Import**: Bulk import questions with validation and error reporting

---

## Getting Started

### Prerequisites

Before setting up the Admin Portal, ensure you have:

1. **Supabase Account**: Active Supabase project with credentials
2. **Node.js**: Version 18.x or higher
3. **npm or yarn**: Package manager installed
4. **Database Access**: Ability to run migrations on your Supabase database

### Environment Variables

Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Migration Steps

1. **Navigate to Supabase Dashboard**
   - Go to your project's SQL Editor

2. **Run the Admin Portal Migration**
   - Open `supabase/migrations/admin_portal_schema.sql`
   - Copy the entire SQL script
   - Paste and execute in the SQL Editor

3. **Verify Tables Created**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('profiles', 'subjects', 'topics', 'questions', 'import_reports');
   ```

4. **Verify RLS Policies**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename IN ('profiles', 'subjects', 'topics', 'questions');
   ```

### Creating the First Admin User

⚠️ **Security Note**: This should be done only once during initial setup.

1. **Sign up a regular user** through the normal signup process
2. **Get the user's ID** from the Supabase Authentication dashboard
3. **Run the setup script**:
   - Navigate to `scripts/setup-first-admin.sql`
   - Replace `YOUR_USER_ID_HERE` with the actual user ID
   - Execute in Supabase SQL Editor

4. **Verify admin access**:
   ```sql
   SELECT id, email, role FROM profiles WHERE role = 'admin';
   ```

5. **Log in** to the admin portal at `/admin/login`

---

## Features Documentation

### Dashboard

**Access**: `/admin/dashboard`

The dashboard provides:

- **User Statistics**: Total users, growth rate, daily/weekly/monthly active users
- **Content Statistics**: Total subjects, topics, questions, and distribution
- **Activity Statistics**: Practice sessions, completion rates, average scores
- **System Alerts**: Important issues requiring attention

**Key Metrics**:
- Users by role (Students, Tutors, Admins)
- Question status (Active, Draft, Archived)
- Recent activity trends
- Low-content warnings

### User Management

**Access**: `/admin/users`

**Capabilities**:
- View all users with pagination
- Search/filter by name, email, or role
- Create new users (students, tutors, admins)
- Edit user profiles
- Change user roles (with permission checks)
- Reset user passwords
- View user details and activity

**Creating a User**:
1. Click "Add User" button
2. Fill in required fields:
   - Email (unique)
   - Full Name
   - Role (student/tutor/admin)
   - Optional: Phone, School, Class
3. System generates temporary password
4. User receives email with credentials

**Resetting Passwords**:
1. Navigate to user detail page
2. Click "Reset Password"
3. System generates new temporary password
4. Admin copies password to share with user

⚠️ **Security Note**: Only admins can create other admins. Tutors cannot access user management.

### Content Management

**Access**: `/admin/content`

**Subjects**:
- Create subjects with name and description
- Edit existing subjects
- Delete subjects (only if no topics exist)
- View topic count per subject

**Topics**:
- Create topics under subjects
- Set difficulty level (Beginner, Intermediate, Advanced)
- Set estimated duration
- Reorder topics with drag-and-drop
- Edit topic details
- Delete topics (only if no questions exist)

**Best Practices**:
- Create subjects before topics
- Use clear, descriptive names
- Set accurate difficulty levels
- Order topics by learning sequence

### Question Bank

**Access**: `/admin/questions`

**Features**:
- View all questions with pagination
- Filter by subject, topic, difficulty, status
- Search by question text or tags
- Preview questions before editing
- Create single questions
- Edit existing questions
- Bulk delete questions
- Draft and publish workflow

**Creating a Question**:
1. Click "Add Question"
2. Select subject and topic
3. Enter question text and image URL (optional)
4. Set question type (Multiple Choice, True/False, etc.)
5. Add answer options (A, B, C, D)
6. Mark correct answer
7. Write detailed explanation
8. Add tags (comma-separated)
9. Set difficulty level
10. Save as draft or publish

**Question Fields**:
- **Subject & Topic**: Required, must exist in database
- **Question Text**: Required, supports markdown
- **Question Type**: Currently supports multiple choice
- **Options**: 4 options (A-D) required
- **Correct Answer**: Must be A, B, C, or D
- **Explanation**: Required, helps students learn
- **Difficulty**: Beginner, Intermediate, or Advanced
- **Tags**: Optional, comma-separated for filtering
- **Status**: Draft or Active

**Bulk Operations**:
- Select multiple questions with checkboxes
- Delete selected questions (with confirmation)
- Export to CSV (future feature)

### CSV Import

**Access**: `/admin/import`

The CSV Import feature allows bulk uploading of questions.

**Process Overview**:
1. Download CSV template
2. Fill in question data
3. Upload file for validation
4. Review validation results
5. Process import if validation passes
6. View import report
7. Access import history

**See [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) for detailed instructions.**

---

## API Documentation

All admin API endpoints require authentication and appropriate role permissions.

### Authentication

Include the Supabase authentication token in all requests:

```javascript
const { data: { session } } = await supabase.auth.getSession();

fetch('/api/admin/endpoint', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

### Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production deployments.

### Endpoints Overview

**Dashboard**:
- `GET /api/admin/dashboard` - Get statistics
- `GET /api/admin/dashboard/alerts` - Get system alerts

**Users**:
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `GET /api/admin/users/[userId]` - Get user details
- `PUT /api/admin/users/[userId]` - Update user
- `DELETE /api/admin/users/[userId]` - Delete user
- `POST /api/admin/users/[userId]/reset-password` - Reset password

**Content**:
- `GET /api/admin/subjects` - List subjects
- `POST /api/admin/subjects` - Create subject
- `PUT /api/admin/subjects/[subjectId]` - Update subject
- `DELETE /api/admin/subjects/[subjectId]` - Delete subject
- `GET /api/admin/topics` - List topics
- `POST /api/admin/topics` - Create topic
- `PUT /api/admin/topics/[topicId]` - Update topic
- `DELETE /api/admin/topics/[topicId]` - Delete topic
- `POST /api/admin/topics/reorder` - Reorder topics

**Questions**:
- `GET /api/admin/questions` - List questions
- `POST /api/admin/questions` - Create question
- `GET /api/admin/questions/[questionId]` - Get question
- `PUT /api/admin/questions/[questionId]` - Update question
- `DELETE /api/admin/questions/[questionId]` - Delete question
- `DELETE /api/admin/questions/bulk` - Bulk delete
- `POST /api/admin/questions/preview` - Preview question

**Import**:
- `GET /api/admin/import/template` - Download CSV template
- `POST /api/admin/import/validate` - Validate CSV file
- `POST /api/admin/import/process` - Process import
- `GET /api/admin/import/reports` - List import reports
- `GET /api/admin/import/reports/[reportId]` - Get report details

**See [API_REFERENCE.md](./API_REFERENCE.md) for detailed request/response examples.**

---

## Security

### Role-Based Access Control (RBAC)

The system implements three role levels:

1. **Student**: Default role, no admin access
2. **Tutor**: Access to content and question management
3. **Admin**: Full access to all features

**Permission Matrix**:

| Feature | Student | Tutor | Admin |
|---------|---------|-------|-------|
| View Dashboard | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Manage Content | ❌ | ✅ | ✅ |
| Manage Questions | ❌ | ✅ | ✅ |
| CSV Import | ❌ | ✅ | ✅ |
| View Reports | ❌ | ✅ | ✅ |

### Admin Authentication

**Middleware Protection**:
- All `/admin/*` routes are protected by middleware
- Users are redirected to `/admin/login` if not authenticated
- Role verification happens server-side on every request

**Session Management**:
- Sessions expire after inactivity period (configurable in Supabase)
- Users must re-authenticate after session expiry
- Tokens are stored securely in httpOnly cookies

### Audit Logging

**Current Implementation**:
- Import operations are logged in `import_reports` table
- Includes: user_id, timestamp, file_name, results

**Future Enhancements**:
- Comprehensive audit log for all admin actions
- Track create/update/delete operations
- User access logs
- Failed authentication attempts

### Best Practices

1. **Never commit credentials**: Keep `.env.local` in `.gitignore`
2. **Use strong passwords**: Enforce minimum requirements
3. **Limit admin accounts**: Only create admins as needed
4. **Regular audits**: Review admin actions periodically
5. **Backup regularly**: Schedule database backups
6. **Update dependencies**: Keep packages up to date for security patches

---

## Troubleshooting

### Common Issues

#### 1. Migration Errors

**Symptom**: Migration fails with constraint errors

**Solution**:
```sql
-- Check if tables already exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- If tables exist, either:
-- Option A: Drop tables (⚠️ DELETES DATA)
DROP TABLE IF EXISTS import_reports CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- Option B: Run only the parts that failed
```

#### 2. Permission Denied Errors

**Symptom**: API returns 403 Forbidden

**Possible Causes**:
- User is not authenticated
- User doesn't have required role
- RLS policies not properly configured

**Solution**:
```sql
-- Check user's role
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'questions';
```

#### 3. Import Failures

**Symptom**: CSV import fails validation or processing

**Common Causes**:
- Invalid subject_id or topic_id (IDs don't exist in database)
- Missing required fields
- Invalid data format
- Duplicate question text

**Solution**:
1. Download fresh template
2. Verify subject and topic IDs exist:
   ```sql
   SELECT id, name FROM subjects;
   SELECT id, name, subject_id FROM topics;
   ```
3. Use exact column names from template
4. Check for empty required fields
5. Ensure correct_answer is A, B, C, or D

#### 4. "User ID not found" Error

**Symptom**: After login, redirected back to login page

**Cause**: Profile not created for user

**Solution**:
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE id = 'user-id-from-auth-table';

-- If missing, create manually
INSERT INTO profiles (id, email, full_name, role)
VALUES ('user-id', 'email@example.com', 'Full Name', 'admin');
```

#### 5. Build Errors

**Symptom**: `npm run build` fails with type errors

**Solution**:
```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install

# Check TypeScript config
npx tsc --noEmit

# Fix type errors one by one
```

#### 6. CORS Errors

**Symptom**: API calls fail with CORS errors in browser console

**Solution**:
- Check Supabase project URL is correct
- Verify environment variables are set
- Ensure Supabase project allows your domain
- Check browser console for specific CORS error messages

### Getting Help

If you encounter issues not covered here:

1. **Check browser console**: Look for detailed error messages
2. **Check server logs**: In development, check terminal output
3. **Verify database**: Use Supabase dashboard to check data
4. **Review migrations**: Ensure all migrations ran successfully
5. **Check documentation**: Review API_REFERENCE.md and CSV_IMPORT_GUIDE.md

---

## Database Schema

### Key Tables

**profiles**:
- User information and roles
- Links to auth.users via id

**subjects**:
- Top-level content organization
- One-to-many with topics

**topics**:
- Second-level content organization
- Belongs to subject
- Contains ordered questions

**questions**:
- Practice question content
- Belongs to topic and subject
- Includes options, answer, explanation

**import_reports**:
- CSV import history
- Tracks success/failure details
- Links to user who imported

### Relationships

```
subjects
  └── topics
        └── questions

profiles
  └── import_reports
```

---

## Development

### Project Structure

```
sabiprep/
├── app/
│   ├── (admin)/          # Admin portal pages
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── users/
│   │       ├── content/
│   │       ├── questions/
│   │       └── import/
│   └── api/
│       └── admin/        # Admin API routes
├── components/
│   └── admin/           # Admin-specific components
├── lib/
│   └── api/
│       └── admin-auth.ts # Admin authentication helpers
├── scripts/
│   └── setup-first-admin.sql
├── supabase/
│   └── migrations/
└── docs/
```

### Adding New Features

1. **Create API route**: `app/api/admin/[feature]/route.ts`
2. **Add page**: `app/(admin)/admin/[feature]/page.tsx`
3. **Create components**: `components/admin/[Feature].tsx`
4. **Update navigation**: Add link in `AdminSidebar.tsx`
5. **Add tests**: Create test file
6. **Update docs**: Document new feature here

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor system alerts on dashboard
- Review failed imports

**Weekly**:
- Review user activity
- Check for outdated content
- Backup database

**Monthly**:
- Audit admin actions
- Review and update questions
- Check system performance
- Update dependencies

### Backup Procedures

**Database Backup**:
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Download latest backup
4. Store securely (encrypted storage recommended)

**Manual Backup**:
```bash
# Export questions
supabase db dump -f backup.sql

# Or via API
curl -H "Authorization: Bearer $TOKEN" \
  https://your-project.supabase.co/rest/v1/questions > questions.json
```

---

## Future Enhancements

Potential features for future development:

1. **Advanced Analytics**: Detailed question performance metrics
2. **Content Versioning**: Track changes to questions over time
3. **Bulk Edit**: Edit multiple questions at once
4. **Question Templates**: Reusable question formats
5. **Collaborative Editing**: Multiple admins working together
6. **Automated Testing**: Generate test papers automatically
7. **Rich Text Editor**: Better question formatting
8. **Image Upload**: Direct image upload instead of URLs
9. **Video Support**: Embedded video explanations
10. **API Rate Limiting**: Prevent abuse

---

## Contributing

When contributing to the Admin Portal:

1. Follow existing code patterns
2. Update documentation for new features
3. Write tests for new functionality
4. Ensure build passes before committing
5. Update this README with significant changes

---

## Support

For technical support or questions:

- Review this documentation first
- Check [API_REFERENCE.md](./API_REFERENCE.md) for API details
- See [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) for import help
- Check [ADMIN_DEPLOYMENT_CHECKLIST.md](./ADMIN_DEPLOYMENT_CHECKLIST.md) for deployment

---

## Version History

### Version 1.0.0 (Current)
- Initial admin portal release
- Dashboard with statistics and alerts
- User management (CRUD)
- Content management (subjects, topics)
- Question bank with full CRUD
- CSV import with validation
- Import history and reporting
- Role-based access control

---

*Last Updated: December 2024*
