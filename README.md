# SabiPrep - Exam Preparation Platform

SabiPrep is a comprehensive exam preparation platform designed to help students master their subjects through adaptive learning and comprehensive practice.

## Overview

SabiPrep provides:
- 📚 **Structured Learning**: Organized by subjects and topics
- 🎯 **Three Learning Modes**: Practice, Test, and Timed Challenge with configurable time limits
- ⚡ **Configurable Time Limits**: Choose 15s, 30s, 45s, or 60s per question in Timed mode
- 🔄 **Quick Retry**: Instantly retry topics with preserved settings
- 📊 **Progress Analytics**: Track performance and improvement
- 🧭 **Comprehensive Navigation**: Header, drawer, and bottom navigation
- 🏆 **Achievements System**: Gamified learning experience
- 👨‍🏫 **Admin Portal**: Comprehensive content management system
- 🎨 **Magic UI Design**: Dark-first, gradient-rich modern interface

## Design System

SabiPrep uses the **Magic UI design system**, a dark-first, gradient-rich design language built with:

- **Tailwind CSS** - Utility-first styling with custom design tokens
- **Framer Motion** - Smooth, performant animations
- **Custom Components** - Reusable Magic UI component library

### Key Features

🌑 **Dark Theme** - Sophisticated slate backgrounds with vibrant cyan and violet accents
✨ **Smooth Animations** - Framer Motion-powered micro-interactions
🎨 **Gradient Magic** - Beautiful color transitions and glowing effects
📱 **Mobile-First** - Responsive design for all screen sizes
♿ **Accessible** - WCAG 2.1 Level AA compliant

### Component Library

The Magic UI component library includes:
- **MagicCard** - Base card with gradient borders and glow effects
- **MagicButton** - Pill-shaped buttons with smooth animations
- **MagicBadge** - Status tags and labels
- **StatCard** - Large number displays with icons
- **BentoGrid** - Flexible grid layouts for dashboards

All components are located in [`components/magic/`](components/magic/index.ts:1).

### Documentation

For complete design system documentation, see:
- **[`MAGIC_UI_DESIGN_SYSTEM.md`](MAGIC_UI_DESIGN_SYSTEM.md:1)** - Complete design tokens, components, and guidelines
- **[`MAGIC_UI_IMPLEMENTATION_SUMMARY.md`](MAGIC_UI_IMPLEMENTATION_SUMMARY.md:1)** - Implementation details and migration guide

### Quick Start

```tsx
import { MagicCard, MagicButton, MagicBadge } from '@/components/magic';

// Use Magic UI components
<MagicCard hover glow className="p-6">
  <h3 className="text-xl font-bold text-white">Card Title</h3>
  <p className="text-slate-400">Card content</p>
  <MagicButton variant="primary">
    Click Me
  </MagicButton>
</MagicCard>
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account (for database and authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sabiprep.git
   cd sabiprep
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   
   See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions on:
   - Running database migrations
   - Setting up tables and relationships
   - Configuring Row Level Security

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
sabiprep/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Student dashboard pages
│   ├── (learning)/        # Learning mode pages
│   ├── (admin)/           # Admin portal pages
│   └── api/               # API routes
├── components/            # React components
│   ├── common/           # Shared components
│   ├── navigation/       # Navigation components
│   └── admin/            # Admin-specific components
├── lib/                  # Utilities and helpers
│   ├── supabaseClient.ts # Supabase client config
│   ├── auth-context.tsx  # Authentication context
│   └── api/              # API helpers
├── hooks/                # Custom React hooks
├── supabase/             # Database migrations
└── public/               # Static assets
```

## Features

### For Students

#### 🎓 Learning Modes

SabiPrep offers three powerful learning modes, each tailored to different learning objectives:

1. **📚 Practice Mode** - *Learn at Your Own Pace*
   - 💡 Hints available when you're stuck
   - 📖 Detailed solutions with step-by-step explanations
   - ⏮️ Navigate back to previous questions
   - ⏱️ No time pressure - take as long as you need
   - 📊 Real-time progress tracking
   - **Best for:** First-time learning, understanding concepts, building confidence

2. **🎯 Test Mode** - *Simulate Exam Conditions*
   - 🎯 No hints available - test your knowledge
   - 📝 Answer all questions before viewing results
   - 🔍 Comprehensive review at the end
   - 🏆 Detailed performance analysis
   - ⏱️ Untimed focus on accuracy
   - **Best for:** Self-assessment, exam preparation, measuring progress

3. **⚡ Timed Challenge** - *Test Your Speed* 🆕
   - ⚡ **Configurable time limits**: Choose 15s, 30s, 45s, or 60s per question
   - 🚀 Auto-advance after answering
   - ⏱️ Visual countdown timer
   - 💯 Instant scoring and accuracy tracking
   - 🔥 High-pressure practice
   - **Best for:** Speed improvement, timed exam practice, challenging yourself

#### 🔄 Quick Retry Functionality 🆕

After completing a session, instantly:
- ↩️ Retry the same topic with identical settings
- 🔀 Switch to a different learning mode with one click
- ⚙️ Settings preserved (question count, time limits)
- 🚀 No reconfiguration needed - start immediately

#### 🧭 Navigation System

- **Header**: Back button and hamburger menu on all pages
- **Navigation Drawer**: Organized sections for quick access to all features
- **Bottom Navigation**: Quick access to Home, Subjects, Analytics, Profile
- **Breadcrumbs**: Always know where you are in the app

#### 📊 Other Features

- **Subject Selection**: Browse and select from available subjects
- **Topic Navigation**: Explore topics within each subject
- **Progress Tracking**: View scores, completion rates, and improvement
- **Achievements**: Earn badges and unlock milestones
- **Analytics Dashboard**: Detailed performance insights

### For Tutors

- **Content Management**: Create and organize subjects and topics
- **Question Bank**: Add, edit, and manage practice questions
- **CSV Import**: Bulk import questions from spreadsheets
- **Analytics**: View student performance and question difficulty

### For Administrators

- **User Management**: Create and manage user accounts and roles
- **Full Content Control**: Complete access to all content features
- **System Monitoring**: Dashboard with statistics and alerts
- **Import Reports**: Track all CSV imports and their results

## Admin Portal

The Admin Portal provides comprehensive content management capabilities for administrators and tutors.

### Quick Links

- 📖 **[Admin Portal Documentation](./ADMIN_PORTAL_README.md)** - Complete guide to the admin portal
- 📊 **[CSV Import Guide](./CSV_IMPORT_GUIDE.md)** - Detailed instructions for bulk question imports
- 🔧 **[API Reference](./API_REFERENCE.md)** - Complete API endpoint documentation
- 🚀 **[Admin Deployment Checklist](./ADMIN_DEPLOYMENT_CHECKLIST.md)** - Deployment guide

### Admin Access

1. **First-time setup**: Use the script in [`scripts/setup-first-admin.sql`](./scripts/setup-first-admin.sql) to promote your first admin user
2. **Access the portal**: Navigate to `/admin/login`
3. **Features available**:
   - Dashboard with real-time statistics
   - User management (admins only)
   - Content management (subjects and topics)
   - Question bank with full CRUD operations
   - CSV import for bulk question uploads
   - Import history and reporting

### Admin Roles

| Role | Dashboard | Users | Content | Questions | Import |
|------|-----------|-------|---------|-----------|--------|
| Student | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tutor | ✅ | ❌ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## Documentation

### User Documentation

- [**LEARNING_MODES.md**](./LEARNING_MODES.md) - 🆕 **Detailed guide to all learning modes**
- [**USER_GUIDE.md**](./USER_GUIDE.md) - 🆕 **Step-by-step usage instructions**
- [README.md](./README.md) - This file - project overview

### General Documentation

- [DESIGN.md](./DESIGN.md) - UI/UX design guidelines
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment guide
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration
- [FINAL_IMPLEMENTATION_STATUS.md](./FINAL_IMPLEMENTATION_STATUS.md) - Current implementation status

### Admin Portal Documentation

- [ADMIN_PORTAL_README.md](./ADMIN_PORTAL_README.md) - Complete admin portal guide
- [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) - CSV import instructions
- [API_REFERENCE.md](./API_REFERENCE.md) - API endpoint documentation
- [ADMIN_DEPLOYMENT_CHECKLIST.md](./ADMIN_DEPLOYMENT_CHECKLIST.md) - Admin deployment steps

### Development Documentation

- [AUTHENTICATION_UPDATE_GUIDE.md](./AUTHENTICATION_UPDATE_GUIDE.md) - Authentication setup
- [SUPABASE_USAGE.md](./SUPABASE_USAGE.md) - Supabase integration guide
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Feature implementation status

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (recommended)

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Environment Variables

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Add more configuration as needed
```

### Database Migrations

Database migration files are located in `supabase/migrations/`:

1. `20231216_initial_schema.sql` - Initial database schema
2. `20231216_seed_data.sql` - Seed data for testing
3. `admin_portal_schema.sql` - Admin portal tables and RLS policies

Run migrations through the Supabase Dashboard SQL Editor.

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure `npm run build` passes before submitting

## Testing

```bash
# Run type checking
npx tsc --noEmit

# Build application (verifies no build errors)
npm run build

# Run linting
npm run lint
```

## Deployment

### Vercel Deployment (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Other Platforms

SabiPrep can be deployed to any platform that supports Next.js:
- AWS Amplify
- Netlify
- Railway
- Self-hosted with Node.js

## Security

- All admin routes are protected by middleware
- Row Level Security (RLS) enabled on all database tables
- Authentication required for all sensitive operations
- Role-based access control (RBAC) for admin features
- Audit logging for important actions

See [ADMIN_PORTAL_README.md](./ADMIN_PORTAL_README.md#security) for detailed security information.

## Support

For issues, questions, or contributions:

- 📧 Email: support@sabiprep.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/sabiprep/issues)
- 📖 Docs: Check the documentation files in this repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database and auth powered by [Supabase](https://supabase.com/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)

---

## 🆕 Recent Updates

### Version 2.0 - December 2024

**New Features:**
- ⚡ **Configurable Time Limits**: Choose from 15s, 30s, 45s, or 60s per question in Timed mode
- 🔄 **Quick Retry**: Instant retry with preserved settings on results page
- 🧭 **Complete Navigation System**: Header, drawer, and bottom navigation fully implemented
- 📚 **Enhanced Documentation**: New comprehensive guides for users and developers

**Implementation Status:**
- ✅ All three learning modes fully functional
- ✅ Authentication system integrated across all pages
- ✅ Comprehensive navigation system
- ✅ Quick access features and optimizations
- ✅ 100% feature completion

### Quick Links

- 📚 [**Learning Modes Guide**](./LEARNING_MODES.md) - Learn about Practice, Test, and Timed modes
- 📖 [**User Guide**](./USER_GUIDE.md) - Complete step-by-step instructions
- 📊 [**Implementation Status**](./FINAL_IMPLEMENTATION_STATUS.md) - See what's complete

---

**Version**: 2.0.0
**Last Updated**: December 17, 2024
**Status**: ✅ Production Ready

For more information:
- Admin Portal: [ADMIN_PORTAL_README.md](./ADMIN_PORTAL_README.md)
- Learning Modes: [LEARNING_MODES.md](./LEARNING_MODES.md)
- User Guide: [USER_GUIDE.md](./USER_GUIDE.md)
