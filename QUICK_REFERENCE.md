# SABIPREP - Quick Reference Guide

A quick reference for developers implementing the SABIPREP app.

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [`DESIGN.md`](./DESIGN.md) | Comprehensive design document with architecture, data models, and features |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture diagrams, data flows, and component hierarchy |
| [`PROJECT_SUMMARY.md`](./PROJECT_SUMMARY.md) | Project overview, roadmap, and success metrics |
| [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) | Detailed checklist for implementation phases |
| [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) | This file - quick lookup guide |

---

## 🎯 Project Overview

**SABIPREP** - Educational prep platform for WAEC, JAMB, NECO exams

### Key Stats
- **13 Screens** in wireframe
- **6 Data Models** (User, Subject, Topic, Question, Progress, Session)
- **3 Learning Modes** (Practice, Test, Timed)
- **4 Main Sections** (Auth, Dashboard, Learning, Analytics)

---

## 🏗️ Folder Structure

```
sabiprep/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/       # Dashboard routes
│   └── (learning)/        # Learning routes
├── components/            # React components
│   ├── common/           # Reusable UI
│   ├── auth/             # Auth components
│   ├── dashboard/        # Dashboard components
│   ├── learning/         # Learning components
│   └── analytics/        # Analytics components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & API
├── types/                # TypeScript definitions
├── supabase/             # Database migrations
└── public/               # Static assets
```

---

## 📱 Screen Map

### Authentication (3 screens)
1. **Splash** - Logo & loading animation
2. **Onboarding** - 3-slide carousel
3. **Login/Signup** - Email/password forms

### Dashboard (4 screens)
1. **Home** - Stats, streak, subjects, daily challenge
2. **Subjects** - Subject selection grid
3. **Topics** - Topic list with progress
4. **Profile** - User profile & settings

### Learning (4 screens)
1. **Mode Select** - Practice/Test/Timed options
2. **Practice** - Questions with hints & solutions
3. **Test** - Exam simulation
4. **Timed** - Speed challenge

### Results & Analytics (2 screens)
1. **Results** - Score & performance breakdown
2. **Analytics** - Weekly stats & topic analysis

---

## 🗄️ Database Schema

### Core Tables
```
users
├── id (UUID)
├── email (VARCHAR)
├── full_name (VARCHAR)
├── grade (VARCHAR)
├── streak_days (INTEGER)
├── average_accuracy (DECIMAL)
└── premium_status (VARCHAR)

subjects
├── id (UUID)
├── name (VARCHAR)
├── total_questions (INTEGER)
└── exams (VARCHAR[])

topics
├── id (UUID)
├── subject_id (FK)
├── name (VARCHAR)
├── total_questions (INTEGER)
└── difficulty (VARCHAR)

questions
├── id (UUID)
├── topic_id (FK)
├── question_text (TEXT)
├── options (JSONB)
├── correct_answer (VARCHAR)
└── explanation (TEXT)

user_progress
├── id (UUID)
├── user_id (FK)
├── topic_id (FK)
├── questions_attempted (INTEGER)
├── accuracy (DECIMAL)
└── last_attempted_at (TIMESTAMP)

sessions
├── id (UUID)
├── user_id (FK)
├── topic_id (FK)
├── mode (VARCHAR)
├── accuracy (DECIMAL)
├── time_spent (INTEGER)
└── answers (JSONB)
```

---

## 🎨 Design System

### Colors
```
Primary:    #4F46E5 (Indigo)
Secondary:  #A855F7 (Purple)
Success:    #10B981 (Emerald)
Warning:    #F59E0B (Amber)
Error:      #EF4444 (Red)
Info:       #3B82F6 (Blue)
Accent:     #F97316 (Orange)
```

### Typography
```
H1: 32px Bold
H2: 24px Bold
H3: 20px Bold
Body: 16px Regular
Small: 12px Regular
Accent: 16px Semibold
```

### Spacing
```
xs: 4px    sm: 8px    md: 16px   lg: 24px
xl: 32px   2xl: 48px
```

---

## 🔑 Key Components

### Common
- `Button` - Primary, secondary, tertiary
- `Card` - Container component
- `Modal` - Dialog component
- `ProgressBar` - Linear & circular
- `Badge` - Status badges
- `BottomNav` - Navigation bar

### Auth
- `LoginForm` - Email/password login
- `SignupForm` - User registration
- `OnboardingCarousel` - Onboarding slides

### Dashboard
- `StatsCard` - Statistics display
- `StreakCard` - Streak indicator
- `SubjectGrid` - Subject selection
- `TopicList` - Topic list
- `ContinueLearning` - Resume card

### Learning
- `QuestionCard` - Question display
- `OptionButton` - Answer option
- `HintBox` - Hint display
- `SolutionBox` - Solution display
- `Timer` - Countdown timer
- `QuestionNavigator` - Question jumper

### Analytics
- `PerformanceChart` - Activity chart
- `TopicBreakdown` - Topic performance
- `StrengthsWeaknesses` - Analysis

---

## 🪝 Custom Hooks

### Authentication
```typescript
useAuth()
├── login(email, password)
├── signup(email, password, name, grade)
├── logout()
├── getCurrentUser()
├── isAuthenticated
├── isLoading
└── error
```

### Questions
```typescript
useQuestions()
├── getSubjects()
├── getTopics(subjectId)
├── getQuestions(topicId)
├── isLoading
└── error
```

### User Progress
```typescript
useUserProgress()
├── getUserProgress()
├── updateProgress(topicId, data)
├── getStats()
├── getStreak()
└── isLoading
```

### Timer
```typescript
useTimer(duration)
├── startTimer()
├── pauseTimer()
├── resumeTimer()
├── timeRemaining
├── isRunning
└── onTimeUp
```

---

## 🔌 API Endpoints

### Auth
```
POST   /auth/v1/signup
POST   /auth/v1/token
POST   /auth/v1/logout
GET    /auth/v1/user
```

### Questions
```
GET    /rest/v1/questions?topic_id=...
GET    /rest/v1/topics/:id
GET    /rest/v1/subjects
```

### Progress
```
GET    /rest/v1/user_progress?user_id=...
POST   /rest/v1/user_progress
PATCH  /rest/v1/user_progress/:id
```

### Sessions
```
POST   /rest/v1/sessions
PATCH  /rest/v1/sessions/:id
GET    /rest/v1/sessions/:id
```

### Analytics
```
GET    /rest/v1/user_analytics?user_id=...
GET    /rest/v1/topic_performance?user_id=...
```

---

## 📊 User Flows

### Authentication Flow
```
Splash → Onboarding → Login/Signup → Home
```

### Learning Flow
```
Home → Subject → Topic → Mode → Questions → Results
```

### Practice Mode
```
Question → Select Answer → Hint (opt) → Solution → Next
```

### Test Mode
```
Question → Select Answer → Navigator → Submit → Results
```

### Timed Mode
```
Timer → Question → Select Answer → Auto-advance → Results
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Folder structure
- Type definitions
- Supabase setup
- Component library

### Phase 2: Core Features (Weeks 3-4)
- Authentication
- Dashboard
- Learning modes
- Results screen

### Phase 3: Analytics & Polish (Weeks 5-6)
- Analytics dashboard
- Profile screen
- Navigation
- Routing

### Phase 4: Testing & Deployment (Week 7)
- Testing
- Optimization
- Deployment
- Monitoring

---

## 📋 Type Definitions Quick Reference

### User
```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  grade: string;
  streakDays: number;
  averageAccuracy: number;
  premiumStatus: 'free' | 'premium';
}
```

### Question
```typescript
interface Question {
  id: string;
  topicId: string;
  questionText: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### Session
```typescript
interface Session {
  id: string;
  userId: string;
  topicId: string;
  mode: 'practice' | 'test' | 'timed';
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeSpent: number;
  answers: Answer[];
}
```

### UserProgress
```typescript
interface UserProgress {
  id: string;
  userId: string;
  topicId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  lastAttemptedAt: Date;
}
```

---

## 🔐 Security Checklist

- [ ] HTTPS only
- [ ] JWT token management
- [ ] Row-Level Security (RLS)
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] Error handling
- [ ] Logging & monitoring

---

## ⚡ Performance Targets

| Metric | Target |
|--------|--------|
| Page Load | < 2s |
| API Response | < 500ms |
| Lighthouse Score | > 90 |
| Mobile Performance | > 85 |
| Error Rate | < 0.1% |
| Uptime | > 99.9% |

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Components render
- [ ] Props work correctly
- [ ] Event handlers fire
- [ ] Hooks work correctly
- [ ] Utilities function properly

### Integration Tests
- [ ] Auth flow works
- [ ] Question flow works
- [ ] Data persists
- [ ] API integration works

### E2E Tests
- [ ] Complete user journey
- [ ] All learning modes
- [ ] Analytics work
- [ ] Profile management

---

## 📱 Responsive Breakpoints

```
Mobile:  < 640px
Tablet:  640px - 1024px
Desktop: > 1024px
```

---

## 🎯 Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration
- Questions per session
- Streak retention

### Learning Outcomes
- Accuracy improvement
- Topic mastery rate
- Exam score correlation
- User retention
- Premium conversion

### Technical
- Page load < 2s
- API response < 500ms
- Error rate < 0.1%
- Uptime > 99.9%
- Mobile score > 90

---

## 🔗 Useful Links

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [React Docs](https://react.dev)

---

## 💡 Tips & Best Practices

### Code Organization
- Keep components small and focused
- Use custom hooks for logic
- Separate concerns (UI, logic, data)
- Use TypeScript for type safety

### Performance
- Lazy load components
- Optimize images
- Cache data appropriately
- Minimize bundle size

### User Experience
- Provide loading states
- Show error messages
- Confirm destructive actions
- Optimize for mobile

### Security
- Validate all inputs
- Use HTTPS
- Protect sensitive data
- Follow OWASP guidelines

---

## 🆘 Common Issues & Solutions

### Issue: Supabase connection fails
**Solution**: Check `.env.local` has correct credentials

### Issue: Components not rendering
**Solution**: Check TypeScript types and imports

### Issue: Slow page load
**Solution**: Implement code splitting and lazy loading

### Issue: Data not persisting
**Solution**: Check RLS policies and API calls

---

## 📞 Support & Questions

For questions about:
- **Design**: See `DESIGN.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Implementation**: See `IMPLEMENTATION_CHECKLIST.md`
- **Overview**: See `PROJECT_SUMMARY.md`

---

**Last Updated**: 2025-12-16  
**Version**: 1.0  
**Status**: Ready for Implementation
