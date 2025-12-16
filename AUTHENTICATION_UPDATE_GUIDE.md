# SABIPR EP - Auth Integration Guide

This guide explains how to update all pages to use real Supabase authentication instead of mock user IDs.

---

## ✅ What's Already Done

1. **Auth Context Created** - [`lib/auth-context.tsx`](lib/auth-context.tsx)
   - Provides `useAuth()` hook with `user`, `userId`, `signIn`, `signUp`, `signOut`
   - Automatically tracks auth state
   - Wrapped around entire app in [`app/layout.tsx`](app/layout.tsx)

2. **Auth Pages Created**
   - [`app/(auth)/login/page.tsx`](app/(auth)/login/page.tsx) - Login page
   - [`app/(auth)/signup/page.tsx`](app/(auth)/signup/page.tsx) - Signup page

3. **Root Page Updated** - [`app/page.tsx`](app/page.tsx)
   - Checks auth state
   - Redirects to /login if not authenticated
   - Redirects to /home if authenticated

---

## 🔧 Pages That Need Updating

All pages currently use `const userId = 'mock-user-id'`. They need to be updated to use the real authenticated user ID from the `useAuth()` hook.

### Update Pattern

**OLD CODE:**
```typescript
const userId = 'mock-user-id';
```

**NEW CODE:**
```typescript
import { useAuth } from '@/lib/auth-context';

export default function PageName() {
  const { userId } = useAuth();
  
  // Add loading check
  if (!userId) {
    return <div>Please login...</div>;
  }
  
  // Rest of component...
}
```

### Pages to Update (8 files)

1. **[`app/(dashboard)/home/page.tsx`](app/(dashboard)/home/page.tsx)** - Line 26
2. **[`app/(dashboard)/subjects/page.tsx`](app/(dashboard)/subjects/page.tsx)** - Line 20
3. **[`app/(dashboard)/analytics/page.tsx`](app/(dashboard)/analytics/page.tsx)** - Line 26
4. **[`app/(dashboard)/profile/page.tsx`](app/(dashboard)/profile/page.tsx)** - Line 30
5. **[`app/(learning)/mode-select/[topicId]/page.tsx`](app/(learning)/mode-select/[topicId]/page.tsx)** - Line 29
6. **[`app/(learning)/practice/[sessionId]/page.tsx`](app/(learning)/practice/[sessionId]/page.tsx)** - Not needed (uses session)
7. **[`app/(learning)/test/[sessionId]/page.tsx`](app/(learning)/test/[sessionId]/page.tsx)** - Not needed (uses session)
8. **[`app/(learning)/timed/[sessionId]/page.tsx`](app/(learning)/timed/[sessionId]/page.tsx)** - Not needed (uses session)

---

## 🛡️ Add Auth Guards

For protected pages, add this check at the top:

```typescript
const { userId, isLoading } = useAuth();

if (isLoading) {
  return <LoadingSpinner />;
}

if (!userId) {
  redirect('/login');
  return null;
}
```

---

## 🔄 Profile Page Logout

Update the logout function in [`app/(dashboard)/profile/page.tsx`](app/(dashboard)/profile/page.tsx):

**OLD:**
```typescript
async function handleLogout() {
  const confirmed = window.confirm('Are you sure you want to logout?');
  if (confirmed) {
    router.push('/login');
  }
}
```

**NEW:**
```typescript
const { signOut } = useAuth();

async function handleLogout() {
  const confirmed = window.confirm('Are you sure you want to logout?');
  if (confirmed) {
    await signOut();
  }
}
```

---

## 🎯 Testing After Updates

1. **Start dev server**: `npm run dev`
2. **Go to** http://localhost:3000
3. **Should redirect to** `/login`
4. **Create account** via `/signup`
5. **Login** with credentials
6. **Should redirect to** `/home` dashboard
7. **Test navigation** through all pages
8. **Verify data** loads correctly
9. **Test logout** from profile page

---

## ⚠️ Common Issues

**Issue**: "useAuth must be used within an AuthProvider"
- **Fix**: Ensure [`app/layout.tsx`](app/layout.tsx) wraps children with `<AuthProvider>`

**Issue**: Pages show "Loading..." forever
- **Fix**: Check Supabase credentials in `.env.local`
- **Fix**: Ensure database migrations have run
- **Fix**: Verify user exists in database

**Issue**: "User not found" error
- **Fix**: Sign up to create new user (trigger auto-creates profile)
- **Fix**: Or manually create user in Supabase dashboard

---

## 📋 Quick Update Checklist

- [x] Create auth context
- [x] Wrap app with AuthProvider
- [x] Create login/signup pages
- [x] Update root page redirect logic
- [ ] Update dashboard/home/page.tsx
- [ ] Update dashboard/subjects/page.tsx
- [ ] Update dashboard/analytics/page.tsx
- [ ] Update dashboard/profile/page.tsx
- [ ] Update mode-select page
- [ ] Test login flow
- [ ] Test signup flow
- [ ] Test all pages with real user

---

**Next Step:** Update all pages to use `useAuth()` hook instead of mock user ID.
