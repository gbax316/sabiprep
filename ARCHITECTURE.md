# SABIPREP - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Next.js)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Pages & Screens (App Router)                │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Auth      │  │  Dashboard   │  │   Learning   │    │   │
│  │  │  Screens    │  │   Screens    │  │   Screens    │    │   │
│  │  └─────────────┘  └──────────────┘  └──────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Reusable Components Library                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Common   │ │  Auth    │ │Dashboard │ │ Learning │   │   │
│  │  │Components│ │Components│ │Components│ │Components│   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              State Management & Hooks                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ useAuth      │  │ useQuestions │  │ useProgress  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Layer & Utilities                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Supabase     │  │ API Calls    │  │ Utilities    │  │   │
│  │  │ Client       │  │              │  │              │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER (Supabase)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Authentication Service                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Email/Pass   │  │ Google OAuth │  │ JWT Tokens   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Users    │ │ Subjects │ │ Topics   │ │Questions │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │   │
│  │  │ Progress │ │ Sessions │ │ Analytics│                │   │
│  │  └──────────┘ └──────────┘ └──────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Row-Level Security (RLS)                    │   │
│  │  - Users can only access their own data                 │   │
│  │  - Public read access to questions/topics               │   │
│  │  - Admin-only write access to content                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### User Authentication Flow
```
User Input (Email/Password)
    ↓
Supabase Auth Service
    ↓
JWT Token Generated
    ↓
Token Stored in Browser
    ↓
Authenticated Requests to API
    ↓
User Data Loaded
```

### Question Answering Flow
```
User Selects Mode & Topic
    ↓
Fetch Questions from Database
    ↓
Display Question & Options
    ↓
User Selects Answer
    ↓
Save Answer to Session
    ↓
Calculate Score
    ↓
Show Result (Practice/Test/Timed)
    ↓
Update User Progress
    ↓
Display Results Screen
```

### Analytics Update Flow
```
Session Completed
    ↓
Calculate Metrics
    ↓
Update User Progress Table
    ↓
Update User Stats
    ↓
Trigger Recommendations
    ↓
Display Analytics Dashboard
```

## Component Dependency Tree

```
App (Root)
├── AuthLayout
│   ├── SplashScreen
│   ├── OnboardingScreen
│   │   └── OnboardingCarousel
│   ├── LoginScreen
│   │   └── LoginForm
│   │       ├── Button
│   │       └── Input
│   └── SignupScreen
│       └── SignupForm
│
├── DashboardLayout
│   ├── BottomNav
│   │   └── NavButton
│   ├── HomeDashboard
│   │   ├── StatsCard
│   │   ├── StreakCard
│   │   ├── ContinueLearning
│   │   │   └── Card
│   │   ├── SubjectGrid
│   │   │   └── SubjectCard
│   │   │       └── Card
│   │   └── DailyChallenge
│   │       └── Card
│   ├── SubjectsScreen
│   │   └── SubjectGrid
│   │       └── SubjectCard
│   ├── TopicsScreen
│   │   ├── SearchBar
│   │   ├── FilterTabs
│   │   └── TopicList
│   │       └── TopicCard
│   │           └── ProgressBar
│   ├── AnalyticsScreen
│   │   ├── StatsCard
│   │   ├── PerformanceChart
│   │   ├── TopicBreakdown
│   │   │   └── TopicCard
│   │   └── StrengthsWeaknesses
│   │       ├── StrengthsList
│   │       └── WeaknessesList
│   └── ProfileScreen
│       ├── ProfileHeader
│       ├── StatsCard
│       ├── MenuItem
│       └── SubscriptionCard
│
└── LearningLayout
    ├── ModeSelectScreen
    │   └── ModeCard
    │       └── Card
    ├── PracticeScreen
    │   ├── Header
    │   ├── QuestionCard
    │   │   ├── QuestionText
    │   │   └── OptionButton (x4)
    │   ├── HintBox
    │   ├── SolutionBox
    │   └── ActionButtons
    │       └── Button (x2)
    ├── TestScreen
    │   ├── Header
    │   ├── QuestionCard
    │   │   ├── QuestionText
    │   │   └── OptionButton (x4)
    │   ├── QuestionNavigator
    │   │   └── QuestionButton (x20)
    │   └── SubmitButton
    ├── TimedScreen
    │   ├── Header
    │   │   └── Timer
    │   │       └── CircularProgress
    │   ├── QuestionCard
    │   │   ├── QuestionText
    │   │   └── OptionButton (x4)
    │   └── ScoreBar
    └── ResultsScreen
        ├── CelebrationHeader
        ├── ScoreCard
        ├── PerformanceBreakdown
        │   └── TopicCard
        │       └── ProgressBar
        ├── Recommendations
        └── ActionButtons
            └── Button (x2)
```

## State Management Strategy

```
Global State (Context/Zustand)
├── Auth State
│   ├── currentUser
│   ├── isAuthenticated
│   ├── isLoading
│   └── error
├── Learning State
│   ├── currentSession
│   ├── currentQuestion
│   ├── selectedAnswers
│   ├── sessionMode
│   └── timeRemaining
└── User State
    ├── userProgress
    ├── userStats
    ├── streakDays
    └── preferences

Local State (Component Level)
├── Form inputs
├── UI toggles (modals, dropdowns)
├── Loading states
└── Temporary data
```

## Database Relationships

```
users (1) ──→ (many) user_progress
users (1) ──→ (many) sessions
users (1) ──→ (many) answers

subjects (1) ──→ (many) topics
subjects (1) ──→ (many) questions

topics (1) ──→ (many) questions
topics (1) ──→ (many) user_progress
topics (1) ──→ (many) sessions

questions (1) ──→ (many) answers

sessions (1) ──→ (many) answers
```

## API Endpoints (Supabase RPC & REST)

### Authentication
- `POST /auth/v1/signup` - Register new user
- `POST /auth/v1/token` - Login
- `POST /auth/v1/logout` - Logout
- `GET /auth/v1/user` - Get current user

### Questions
- `GET /rest/v1/questions?topic_id=...` - Get questions by topic
- `GET /rest/v1/questions/:id` - Get single question
- `GET /rest/v1/topics/:id` - Get topic details

### User Progress
- `GET /rest/v1/user_progress?user_id=...` - Get user progress
- `POST /rest/v1/user_progress` - Create/update progress
- `GET /rest/v1/user_progress/:id` - Get specific progress

### Sessions
- `POST /rest/v1/sessions` - Create new session
- `PATCH /rest/v1/sessions/:id` - Update session
- `GET /rest/v1/sessions/:id` - Get session details
- `POST /rest/v1/sessions/:id/complete` - Complete session

### Analytics
- `GET /rest/v1/user_analytics?user_id=...` - Get user analytics
- `GET /rest/v1/topic_performance?user_id=...` - Get topic performance

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js App                                         │  │
│  │  - Automatic deployments from GitHub                │  │
│  │  - Edge functions for API routes                    │  │
│  │  - Image optimization                              │  │
│  │  - CDN for static assets                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Cloud (Backend)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                │  │
│  │  - Automated backups                               │  │
│  │  - Point-in-time recovery                          │  │
│  │  - Replication for HA                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Service                                       │  │
│  │  - JWT token management                            │  │
│  │  - OAuth providers                                 │  │
│  │  - Email verification                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Storage (Optional)                                │  │
│  │  - User avatars                                    │  │
│  │  - Question images                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization Strategy

```
Frontend Optimization
├── Code Splitting
│   ├── Route-based splitting
│   └── Component lazy loading
├── Image Optimization
│   ├── Next.js Image component
│   ├── WebP format
│   └── Responsive images
├── Caching
│   ├── Browser cache
│   ├── Service Worker
│   └── SWR for data fetching
└── Bundle Size
    ├── Tree shaking
    ├── Minification
    └── Compression

Backend Optimization
├── Database
│   ├── Indexing on frequently queried columns
│   ├── Query optimization
│   └── Connection pooling
├── API
│   ├── Response caching
│   ├── Pagination
│   └── Rate limiting
└── Infrastructure
    ├── CDN for static assets
    ├── Database replication
    └── Load balancing
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Transport Security                           │
│  - HTTPS/TLS encryption                               │
│  - HSTS headers                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Authentication                              │
│  - JWT tokens                                         │
│  - Secure session management                          │
│  - Password hashing (bcrypt)                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Authorization                               │
│  - Row-Level Security (RLS)                           │
│  - Role-based access control                          │
│  - API key validation                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Data Protection                             │
│  - Input validation                                   │
│  - SQL injection prevention                           │
│  - XSS protection                                     │
│  - CSRF tokens                                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Application Security                        │
│  - Error handling                                     │
│  - Logging and monitoring                             │
│  - Rate limiting                                      │
│  - DDoS protection                                    │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated**: 2025-12-16  
**Status**: Ready for Implementation
