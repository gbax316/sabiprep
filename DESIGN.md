# SABIPREP - Design Document

**Version**: 1.0
**Last Updated**: 2025-12-16
**Status**: In Development

---

## 1. Project Overview

**SABIPREP** is a mobile-first educational preparation platform designed to help Nigerian students prepare for major standardized exams:
- WAEC (West African Examinations Council)
- JAMB (Joint Admissions and Matriculation Board)
- NECO (National Examination Council)

### Key Features
- **Multiple Learning Modes**: Practice, Test, and Timed modes
- **Comprehensive Question Bank**: 1000+ questions across multiple subjects
- **Performance Analytics**: Detailed tracking of progress and weak areas
- **Streak System**: Gamification to encourage consistent learning
- **Adaptive Learning**: Personalized recommendations based on performance

### Target Users
- Secondary school students (SS1-SS3)
- Exam candidates preparing for WAEC, JAMB, NECO
- Age range: 15-25 years

---

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API / Zustand (TBD)
- **HTTP Client**: Fetch API / Axios

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (optional)
- **File Storage**: Supabase Storage

### Deployment
- **Hosting**: Vercel (Next.js optimized)
- **Database**: Supabase Cloud

---

## 3. App Architecture

### 3.1 Folder Structure

```
sabiprep/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   ├── (auth)/
│   │   ├── splash/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── home/page.tsx
│   │   ├── subjects/page.tsx
│   │   ├── topics/[subjectId]/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── profile/page.tsx
│   ├── (learning)/
│   │   ├── mode-select/[topicId]/page.tsx
│   │   ├── practice/[sessionId]/page.tsx
│   │   ├── test/[sessionId]/page.tsx
│   │   ├── timed/[sessionId]/page.tsx
│   │   └── results/[sessionId]/page.tsx
│   └── globals.css
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Badge.tsx
│   │   └── BottomNav.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── OnboardingCarousel.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── StreakCard.tsx
│   │   ├── SubjectGrid.tsx
│   │   ├── TopicList.tsx
│   │   └── ContinueLearning.tsx
│   ├── learning/
│   │   ├── QuestionCard.tsx
│   │   ├── OptionButton.tsx
│   │   ├── HintBox.tsx
│   │   ├── SolutionBox.tsx
│   │   ├── Timer.tsx
│   │   └── QuestionNavigator.tsx
│   └── analytics/
│       ├── PerformanceChart.tsx
│       ├── TopicBreakdown.tsx
│       └── StrengthsWeaknesses.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useQuestions.ts
│   ├── useUserProgress.ts
│   ├── useTimer.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── supabaseClient.ts
│   ├── supabaseServer.ts
│   ├── api.ts
│   └── utils.ts
├── types/
│   ├── index.ts
│   ├── auth.ts
│   ├── questions.ts
│   ├── user.ts
│   └── analytics.ts
├── styles/
│   └── globals.css
├── public/
├── supabase/
│   ├── migrations/
│   └── config.toml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── DESIGN.md
```

### 3.2 Component Hierarchy

```
App
├── AuthLayout
│   ├── SplashScreen
│   ├── OnboardingScreen
│   ├── LoginScreen
│   └── SignupScreen
├── DashboardLayout
│   ├── BottomNav
│   ├── HomeDashboard
│   │   ├── StatsCard
│   │   ├── StreakCard
│   │   ├── ContinueLearning
│   │   ├── SubjectGrid
│   │   └── DailyChallenge
│   ├── SubjectsScreen
│   │   └── SubjectGrid
│   ├── TopicsScreen
│   │   └── TopicList
│   ├── AnalyticsScreen
│   │   ├── PerformanceChart
│   │   ├── TopicBreakdown
│   │   └── StrengthsWeaknesses
│   └── ProfileScreen
└── LearningLayout
    ├── ModeSelectScreen
    ├── PracticeScreen
    │   ├── QuestionCard
    │   ├── OptionButton
    │   ├── HintBox
    │   └── SolutionBox
    ├── TestScreen
    │   ├── QuestionCard
    │   ├── OptionButton
    │   └── QuestionNavigator
    ├── TimedScreen
    │   ├── Timer
    │   ├── QuestionCard
    │   └── OptionButton
    └── ResultsScreen
        ├── ScoreCard
        ├── TopicBreakdown
        └── Recommendations
```

---

## 4. Data Models & Database Schema

### 4.1 User Model

```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unique
  fullName: string;
  avatar?: string;               // URL
  grade: string;                 // SS1, SS2, SS3
  joinedAt: Date;
  lastActiveAt: Date;
  streakDays: number;
  totalQuestionsAnswered: number;
  averageAccuracy: number;
  currentRank: number;
  premiumStatus: 'free' | 'premium';
  premiumExpiresAt?: Date;
}
```

### 4.2 Subject Model

```typescript
interface Subject {
  id: string;
  name: string;                  // Mathematics, English, etc.
  description: string;
  icon: string;                  // Icon name
  color: string;                 // Tailwind color
  totalQuestions: number;
  totalTopics: number;
  exams: string[];               // WAEC, JAMB, NECO
  createdAt: Date;
}
```

### 4.3 Topic Model

```typescript
interface Topic {
  id: string;
  subjectId: string;
  name: string;                  // Quadratic Equations, etc.
  description: string;
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  exams: string[];
  createdAt: Date;
}
```

### 4.4 Question Model

```typescript
interface Question {
  id: string;
  topicId: string;
  subjectId: string;
  questionText: string;
  options: {
    key: string;                 // A, B, C, D
    text: string;
  }[];
  correctAnswer: string;         // A, B, C, D
  explanation: string;           // Detailed solution
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  exams: string[];
  year?: number;
  createdAt: Date;
}
```

### 4.5 UserProgress Model

```typescript
interface UserProgress {
  id: string;
  userId: string;
  topicId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;              // Percentage
  lastAttemptedAt: Date;
  createdAt: Date;
}
```

### 4.6 Session Model

```typescript
interface Session {
  id: string;
  userId: string;
  topicId: string;
  mode: 'practice' | 'test' | 'timed';
  totalQuestions: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  timeSpent: number;             // In seconds
  startedAt: Date;
  completedAt?: Date;
  answers: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }[];
}
```

### 4.7 Database Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  avatar_url VARCHAR,
  grade VARCHAR,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  streak_days INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  average_accuracy DECIMAL DEFAULT 0,
  current_rank INTEGER,
  premium_status VARCHAR DEFAULT 'free',
  premium_expires_at TIMESTAMP
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  icon VARCHAR,
  color VARCHAR,
  total_questions INTEGER,
  total_topics INTEGER,
  exams VARCHAR[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Topics
CREATE TABLE topics (
  id UUID PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id),
  name VARCHAR NOT NULL,
  description TEXT,
  total_questions INTEGER,
  difficulty VARCHAR,
  exams VARCHAR[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  subject_id UUID REFERENCES subjects(id),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer VARCHAR,
  explanation TEXT,
  hint TEXT,
  difficulty VARCHAR,
  exams VARCHAR[],
  year INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Progress
CREATE TABLE user_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  topic_id UUID REFERENCES topics(id),
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy DECIMAL DEFAULT 0,
  last_attempted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  topic_id UUID REFERENCES topics(id),
  mode VARCHAR NOT NULL,
  total_questions INTEGER,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy DECIMAL DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  answers JSONB
);
```

---

## 5. User Flows

### 5.1 Authentication Flow

```
Splash Screen (2-3 sec)
    ↓
Onboarding (3 slides)
    ↓
Login/Signup
    ↓
Home Dashboard
```

### 5.2 Learning Flow

```
Home Dashboard
    ↓
Select Subject
    ↓
Select Topic
    ↓
Select Mode (Practice/Test/Timed)
    ↓
Select Question Count
    ↓
Answer Questions
    ↓
Results Screen
    ↓
Back to Dashboard
```

### 5.3 Practice Mode Flow

```
Question Display
    ↓
Select Answer
    ↓
Show Hint (optional)
    ↓
Show Solution
    ↓
Next Question
    ↓
Complete Session
```

### 5.4 Test Mode Flow

```
Question Display
    ↓
Select Answer (no hints)
    ↓
Next Question
    ↓
Question Navigator (jump to any question)
    ↓
Submit Test
    ↓
Results with Score
```

### 5.5 Timed Mode Flow

```
Start Timer (30 sec per question)
    ↓
Question Display
    ↓
Select Answer
    ↓
Auto-advance on timer
    ↓
Complete Session
    ↓
Results with Speed Score
```

---

## 6. Key Features & Implementation Details

### 6.1 Authentication
- Email/Password signup and login
- Google OAuth integration (optional)
- Session persistence with Supabase Auth
- Protected routes with middleware

### 6.2 Dashboard
- Real-time stats (questions answered, accuracy, study time)
- 7-day streak tracking with visual indicator
- Continue learning from last topic
- Subject grid with question counts
- Daily challenge card

### 6.3 Learning Modes

#### Practice Mode
- Unlimited attempts
- Hints available
- Full solutions shown after answer
- No time pressure
- Progress saved

#### Test Mode
- Simulates exam conditions
- No hints or solutions during test
- Solutions shown after submission
- Question navigator to jump between questions
- Final score and breakdown

#### Timed Mode
- 30 seconds per question (configurable)
- Auto-advance on timer
- Speed-based scoring
- Leaderboard integration (optional)
- Real-time score tracking

### 6.4 Analytics
- Weekly activity chart
- Subject-wise performance
- Topic-wise accuracy breakdown
- Strengths and weaknesses identification
- Personalized recommendations

### 6.5 Gamification
- Streak system (consecutive days)
- Badges and achievements
- Leaderboard ranking
- Points/XP system
- Level progression

---

## 7. UI/UX Design System

### 7.1 Color Palette

```
Primary: Indigo (#4F46E5)
Secondary: Purple (#A855F7)
Success: Emerald (#10B981)
Warning: Amber (#F59E0B)
Error: Red (#EF4444)
Info: Blue (#3B82F6)
Accent: Orange (#F97316)

Background: Gray-50 (#F9FAFB)
Surface: White (#FFFFFF)
Border: Gray-200 (#E5E7EB)
Text: Gray-900 (#111827)
Text Secondary: Gray-500 (#6B7280)
```

### 7.2 Typography

```
Headings: Bold (700)
  - H1: 32px
  - H2: 24px
  - H3: 20px
  - H4: 18px

Body: Regular (400)
  - Large: 16px
  - Regular: 14px
  - Small: 12px

Accent: Semibold (600)
```

### 7.3 Spacing

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
```

### 7.4 Border Radius

```
sm: 4px
md: 8px
lg: 12px
xl: 16px
2xl: 24px
3xl: 32px
```

---

## 8. Performance Considerations

### 8.1 Optimization Strategies
- Image optimization with Next.js Image component
- Code splitting by route
- Lazy loading of components
- Caching of question data
- Debouncing of API calls
- Service Worker for offline support (optional)

### 8.2 Loading States
- Skeleton screens for data loading
- Progress indicators for long operations
- Optimistic UI updates
- Error boundaries with retry logic

### 8.3 Mobile Optimization
- Touch-friendly button sizes (min 44x44px)
- Responsive design for all screen sizes
- Optimized for low bandwidth
- Battery-efficient animations

---

## 9. Security Considerations

### 9.1 Authentication
- Secure password hashing (Supabase handles)
- JWT token management
- Secure session storage
- CSRF protection

### 9.2 Data Protection
- Row-level security (RLS) in Supabase
- Encrypted sensitive data
- HTTPS only
- Input validation and sanitization

### 9.3 API Security
- Rate limiting
- API key management
- CORS configuration
- Request validation

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Component rendering
- Hook logic
- Utility functions
- Type safety

### 10.2 Integration Tests
- User authentication flow
- Question answering flow
- Data persistence
- API integration

### 10.3 E2E Tests
- Complete user journey
- Cross-browser testing
- Mobile responsiveness
- Performance testing

---

## 11. Deployment & DevOps

### 11.1 Development
- Local development with `npm run dev`
- Hot module reloading
- Environment variables in `.env.local`

### 11.2 Staging
- Staging environment on Vercel
- Staging Supabase project
- Pre-deployment testing

### 11.3 Production
- Production deployment on Vercel
- Production Supabase database
- CDN for static assets
- Monitoring and logging

---

## 12. Future Enhancements

### Phase 2
- Video tutorials for topics
- Live tutoring sessions
- Peer discussion forums
- Offline mode with sync
- Advanced analytics with ML recommendations

### Phase 3
- Mobile app (React Native)
- Adaptive difficulty
- AI-powered question generation
- Subscription management
- Payment integration

### Phase 4
- Teacher dashboard
- Classroom management
- Assignment creation
- Student progress tracking
- Batch reporting

---

## 13. Success Metrics

### User Engagement
- Daily active users (DAU)
- Monthly active users (MAU)
- Session duration
- Questions answered per session
- Streak retention rate

### Learning Outcomes
- Average accuracy improvement
- Topic mastery rate
- Exam score correlation
- User retention rate
- Premium conversion rate

### Technical Metrics
- Page load time < 2s
- API response time < 500ms
- Error rate < 0.1%
- Uptime > 99.9%
- Mobile performance score > 90

---

## 14. Changelog

### Version 1.0 (Current)
- Initial design document
- 13 wireframe screens
- Database schema
- Component architecture
- User flows

---

**Document Status**: Ready for Implementation  
**Next Step**: Begin with folder structure setup and component library creation
