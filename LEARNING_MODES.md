# 🎓 Learning Modes - SabiPrep

## Overview

SabiPrep offers three distinct learning modes, each designed to support different learning objectives and preferences. Whether you're just starting to learn new material or preparing for an exam, our flexible modes adapt to your needs.

---

## 📚 Practice Mode

**Best For:** Learning new material, understanding concepts, and building confidence

### Features

| Feature | Description |
|---------|-------------|
| 💡 **Hints Available** | Get helpful hints when you're stuck on a question |
| 📖 **Detailed Solutions** | View step-by-step solutions after answering |
| ⏮️ **Navigation Freedom** | Go back to previous questions anytime |
| ⏱️ **No Time Pressure** | Take as much time as you need |
| 📊 **Progress Tracking** | Monitor your learning progress in real-time |
| 🔄 **Immediate Feedback** | Instant feedback on each answer |

### How It Works

1. **Select Topic**: Choose the topic you want to practice
2. **Configure Settings**: Select number of questions (10, 20, 30, or 40)
3. **Start Learning**: Answer questions at your own pace
4. **Use Hints**: Click the hint button when you need help
5. **View Solutions**: See detailed explanations for each question
6. **Review Progress**: Check your score and areas for improvement

### User Flow

```
Topics → Mode Selection → Practice Mode → Answer Questions → View Results
                            ↓ Configure
                         Number of Questions
```

### When to Use

- ✅ When learning new topics for the first time
- ✅ When you need to understand concepts deeply
- ✅ When studying without time pressure
- ✅ When you want to learn from mistakes immediately
- ✅ When building foundational knowledge

### UI Components

**Implementation Files:**
- [`app/(learning)/practice/[sessionId]/page.tsx`](app/(learning)/practice/[sessionId]/page.tsx) - Main practice interface
- [`app/(learning)/mode-select/[topicId]/page.tsx`](app/(learning)/mode-select/[topicId]/page.tsx) - Mode selection screen

**Key Features in UI:**
- Question card with clear typography
- Hint button (lightbulb icon)
- Solution card with detailed explanations
- Progress tracker showing questions answered
- Navigation buttons (Previous/Next)
- Current score display

---

## 🎯 Test Mode

**Best For:** Self-assessment, exam simulation, and measuring knowledge retention

### Features

| Feature | Description |
|---------|-------------|
| 🎯 **No Hints** | Challenge yourself without assistance |
| 📝 **Answer All Questions** | Complete all questions before viewing results |
| 🔍 **End Review** | Review all answers and solutions at the end |
| 🏆 **Comprehensive Scoring** | Get detailed performance analysis |
| 📊 **Progress Summary** | See overview of answered questions |
| ⏱️ **Untimed** | Focus on accuracy without time constraints |

### How It Works

1. **Select Topic**: Choose the topic you want to test on
2. **Configure Settings**: Select number of questions (10, 20, 30, or 40)
3. **Start Test**: Answer all questions
4. **Submit Test**: Complete the test when done
5. **View Results**: See comprehensive results and review all questions
6. **Learn from Mistakes**: Review explanations for incorrect answers

### User Flow

```
Topics → Mode Selection → Test Mode → Answer All Questions → Submit → Detailed Results
                           ↓ Configure
                        Number of Questions
```

### When to Use

- ✅ When preparing for actual exams
- ✅ When you want to test your knowledge
- ✅ When simulating exam conditions (without hints)
- ✅ When measuring progress over time
- ✅ When you're confident with the material

### UI Components

**Implementation Files:**
- [`app/(learning)/test/[sessionId]/page.tsx`](app/(learning)/test/[sessionId]/page.tsx) - Main test interface

**Key Features in UI:**
- Clean question card without hints
- Question navigator showing all questions
- Submit button (available when all questions answered)
- Progress indicator
- No solution preview until test submission
- Confirmation dialog before submission

---

## ⚡ Timed Challenge Mode

**Best For:** Speed practice, exam readiness, and testing under pressure

### Features

| Feature | Description |
|---------|-------------|
| ⚡ **Configurable Time Limits** | Choose 15s, 30s, 45s, or 60s per question |
| 🚀 **Auto-Advance** | Automatically moves to next question after answer |
| ⏱️ **Beat the Clock** | Visual countdown timer for each question |
| 💯 **Instant Scoring** | See your score update in real-time |
| 📊 **Accuracy Tracking** | Monitor accuracy percentage throughout |
| 🔥 **High-Pressure Practice** | Simulate time-constrained exam conditions |

### How It Works

1. **Select Topic**: Choose the topic you want to practice
2. **Configure Settings**: 
   - Select number of questions (10, 20, 30, or 40)
   - **Choose time limit**: 15s, 30s, 45s, or 60s per question
3. **Start Challenge**: Timer starts immediately
4. **Answer Quickly**: Select answer before time runs out
5. **Auto-Advance**: Question advances automatically after selection
6. **View Results**: See final score and performance metrics

### User Flow

```
Topics → Mode Selection → Timed Mode → Answer Questions → View Results
           ↓ Configure           ↓
    Number of Questions    Time Limit
                        (15/30/45/60s)
```

### Configurable Time Limits

| Time Limit | Difficulty | Best For |
|------------|-----------|----------|
| **15 seconds** | ⚡ Very Hard | Advanced users, speed practice |
| **30 seconds** | 🔥 Hard | Intermediate users, quick thinking |
| **45 seconds** | ⚠️ Medium | Most users, balanced practice |
| **60 seconds** | ✅ Easy | Beginners, complex questions |

**Configuration Location:** Time limit is selected on the mode selection screen before starting the session.

**Implementation:** The time limit is stored in [`session.time_limit_seconds`](app/(learning)/timed/[sessionId]/page.tsx:73) and applied to each question.

### When to Use

- ✅ When preparing for timed exams
- ✅ When you want to improve response speed
- ✅ When practicing quick decision-making
- ✅ When you're comfortable with the material
- ✅ When challenging yourself under pressure

### UI Components

**Implementation Files:**
- [`app/(learning)/timed/[sessionId]/page.tsx`](app/(learning)/timed/[sessionId]/page.tsx) - Main timed challenge interface
- [`hooks/useTimer.ts`](hooks/useTimer.ts) - Timer functionality
- [`components/common/CircularTimer.tsx`](components/common/CircularTimer.tsx) - Visual timer component

**Key Features in UI:**
- Large countdown timer display
- Progress bar showing time remaining
- Timer color changes when time is low (< 10s)
- Real-time score display
- Accuracy percentage
- Auto-advance after answer selection
- Visual feedback for correct/incorrect answers

---

## 📊 Results & Review

All three modes provide comprehensive results pages with:

### Results Page Features

| Feature | Description |
|---------|-------------|
| 🎯 **Score Display** | Large, prominent score percentage |
| 📊 **Performance Analysis** | Breakdown of correct/incorrect answers |
| ⏱️ **Time Stats** | Total time spent on the session |
| 🏆 **Grade Label** | Achievement label (Excellent, Good, etc.) |
| 💡 **Recommendations** | Personalized suggestions for improvement |
| 🔄 **Quick Retry** | Restart with same settings or try different mode |

### Quick Retry Functionality

**New Enhancement!** Quick retry allows you to:

1. **Repeat Same Mode**: Practice the same topic with the same mode and settings
2. **Try Alternative Modes**: Switch to a different learning mode with one click
3. **Preserve Settings**: Number of questions and time limits are preserved
4. **No Reconfiguration**: Start immediately without going back to mode selection

**Implementation:**
- Primary retry button for same mode ([`results/[sessionId]/page.tsx`](app/(learning)/results/[sessionId]/page.tsx:299))
- Alternative mode buttons for quick mode switching ([`results/[sessionId]/page.tsx`](app/(learning)/results/[sessionId]/page.tsx:325))
- Settings preservation in new session creation ([`results/[sessionId]/page.tsx`](app/(learning)/results/[sessionId]/page.tsx:92))

**User Flow:**
```
Results Page → Choose Retry Option → New Session Starts Immediately
                    ↓
        Same Mode or Alternative Mode
```

---

## 🧭 Navigation System

### Header Navigation

**Components:**
- [`components/navigation/Header.tsx`](components/navigation/Header.tsx) - Main header with back button and menu

**Features:**
- Back button (ArrowLeft icon) on all learning pages
- Hamburger menu for accessing navigation drawer
- Subject and topic information display
- Progress indicators

### Navigation Drawer

**Components:**
- [`components/navigation/NavigationDrawer.tsx`](components/navigation/NavigationDrawer.tsx) - Side navigation drawer

**Features:**
- Access to all main sections
- User profile information
- Quick links to subjects and settings
- Organized sections by category

### Bottom Navigation

**Components:**
- [`components/common/BottomNav.tsx`](components/common/BottomNav.tsx) - Bottom navigation bar

**Features:**
- Quick access to: Home, Subjects, Analytics, Profile
- Always visible on main app pages
- Active tab highlighting
- Icon-based navigation

---

## 🔧 Technical Implementation

### Session Management

All learning modes use the same session management system:

```typescript
// Session Creation
const session = await createSession({
  userId,
  subjectId: subject.id,
  topicId: topic.id,
  mode: 'practice' | 'test' | 'timed',
  totalQuestions: 20,
  timeLimit?: 30, // Only for timed mode
});

// Navigate to mode-specific page
router.push(`/${mode}/${session.id}`);
```

**API Functions** ([`lib/api.ts`](lib/api.ts)):
- [`createSession()`](lib/api.ts) - Creates new learning session
- [`getSession()`](lib/api.ts) - Retrieves session data
- [`updateSession()`](lib/api.ts) - Updates session progress
- [`completeSession()`](lib/api.ts) - Marks session as complete
- [`createSessionAnswer()`](lib/api.ts) - Records answer data
- [`getSessionAnswers()`](lib/api.ts) - Retrieves all session answers

### Answer Recording

Each answer is recorded with:
- Question ID
- User's selected answer
- Whether it was correct
- Time spent on the question
- Whether hints were used (Practice mode)
- Whether solution was viewed (Practice mode)

### State Management

Learning modes use React hooks for state management:
- `useState` for question state, answers, and UI state
- `useEffect` for loading data and side effects
- [`useTimer()`](hooks/useTimer.ts) for countdown timers (Timed mode)
- [`useAuth()`](lib/auth-context.tsx) for user authentication

---

## 📈 Best Practices

### For Students

1. **Start with Practice Mode**: Build foundational knowledge first
2. **Use Hints Wisely**: Try to solve before viewing hints
3. **Read Explanations**: Learn from detailed solutions
4. **Progress Gradually**: Master easier topics before harder ones
5. **Use Test Mode**: Assess your knowledge periodically
6. **Challenge Yourself**: Use Timed mode when confident
7. **Review Mistakes**: Learn from incorrect answers
8. **Maintain Consistency**: Practice regularly for best results

### Recommended Learning Path

```
1. Practice Mode (First Time Learning)
   ↓
2. Practice Mode (Reinforcement)
   ↓
3. Test Mode (Self-Assessment)
   ↓
4. Practice Mode (Review Weak Areas)
   ↓
5. Timed Mode (Speed Practice)
   ↓
6. Test Mode (Final Assessment)
```

### Mode Selection Guide

| Your Goal | Recommended Mode | Time Limit (if Timed) |
|-----------|------------------|----------------------|
| First-time learning | Practice | N/A |
| Understanding concepts | Practice | N/A |
| Self-assessment | Test | N/A |
| Exam preparation | Test | N/A |
| Speed improvement | Timed | 30s or 45s |
| Challenge yourself | Timed | 15s or 30s |
| Realistic exam practice | Timed | 45s or 60s |

---

## 🎯 Feature Comparison

| Feature | Practice Mode | Test Mode | Timed Mode |
|---------|--------------|-----------|------------|
| **Hints** | ✅ Available | ❌ Not available | ❌ Not available |
| **Solutions** | ✅ Immediate | ✅ After submission | ✅ After answer |
| **Time Limit** | ❌ None | ❌ None | ✅ Configurable |
| **Navigation** | ✅ Backward/Forward | ✅ Question navigator | ❌ Auto-advance |
| **Submission** | ❌ Not required | ✅ Required | ✅ Automatic |
| **Feedback** | ✅ Immediate | ✅ After submission | ✅ Immediate |
| **Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard |
| **Best For** | Learning | Assessment | Speed Practice |

---

## 🚀 Getting Started

### Starting a Learning Session

1. **Log in** to your SabiPrep account
2. **Navigate** to Home → Subjects
3. **Select** a subject (e.g., Mathematics)
4. **Choose** a topic (e.g., Algebra)
5. **Configure** session settings:
   - Number of questions
   - Time limit (if using Timed mode)
6. **Select** your preferred learning mode
7. **Start** practicing!

### Tips for Success

- 📱 **Use on any device**: SabiPrep works on desktop, tablet, and mobile
- 🔔 **Enable notifications**: Get reminders to maintain learning streaks
- 📊 **Check analytics**: Review your progress regularly
- 🎯 **Set goals**: Aim for specific scores or topics
- 👥 **Join challenges**: Compete with friends (coming soon)

---

## 📚 Related Documentation

- [**README.md**](README.md) - Project overview and setup
- [**USER_GUIDE.md**](USER_GUIDE.md) - Comprehensive user guide
- [**FINAL_IMPLEMENTATION_STATUS.md**](FINAL_IMPLEMENTATION_STATUS.md) - Implementation status
- [**DESIGN.md**](DESIGN.md) - UI/UX design specifications
- [**ARCHITECTURE.md**](ARCHITECTURE.md) - System architecture

---

## 🆘 Support

Need help? Check out:
- 📖 [User Guide](USER_GUIDE.md) for detailed instructions
- ❓ [FAQ](#) (coming soon)
- 📧 Email: support@sabiprep.com
- 🐛 [Report an issue](https://github.com/yourusername/sabiprep/issues)

---

**Version:** 2.0  
**Last Updated:** December 2024  
**Status:** ✅ Fully Implemented

All three learning modes are production-ready with complete functionality including configurable time limits, quick retry, and comprehensive navigation.
