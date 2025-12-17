# SabiPrep Testing & Verification Checklist

## 📋 Document Information

**Version:** 1.0  
**Last Updated:** December 2025  
**Purpose:** Comprehensive testing guide for SabiPrep learning modes and navigation system  
**Target Audience:** QA Engineers, Developers, Product Managers

---

## 🎯 Testing Overview

This document provides a systematic approach to testing all core functionality of the SabiPrep platform, including:
- Three learning modes (Practice, Test, Timed)
- Complete navigation system (Header, Drawer, Bottom Nav)
- Quick retry functionality
- End-to-end user flows
- Responsive design across devices

### How to Use This Checklist

1. **Sequential Testing**: Follow sections in order for comprehensive coverage
2. **Check Off Items**: Mark items as complete using `[x]` in markdown
3. **Document Issues**: Record any issues in the Issues Log section at the end
4. **Severity Classification**: Use Critical/Important/Minor for prioritization
5. **Screenshot Evidence**: Take screenshots for visual verification (placeholders provided)

### Testing Environment Requirements

- **Browser:** Latest Chrome, Firefox, Safari, Edge
- **Devices:** Desktop, tablet (iPad), mobile (iOS/Android)
- **Network:** Test on stable connection and throttled (3G) connection
- **Data:** Clean test database with seed data loaded

---

## 1️⃣ Pre-Testing Setup

### Database Verification

- [ ] **Verify time_limit_seconds column exists**
  - Navigate to Supabase Dashboard → Table Editor → learning_sessions
  - Confirm `time_limit_seconds` column is present and type is INTEGER
  - **Expected:** Column exists with proper type
  - **Actual:** _______________

- [ ] **Check migration status**
  - Run: `npx supabase migration list`
  - Verify all migrations are applied
  - **Expected:** All migrations show as "applied"
  - **Actual:** _______________

- [ ] **Verify database seed data**
  - Check subjects table has data (minimum 3 subjects)
  - Check topics table has data (minimum 5 topics per subject)
  - Check questions table has adequate questions (minimum 40 per topic)
  - **Expected:** Sufficient test data for all modes
  - **Actual:** _______________

### Environment Configuration

- [ ] **Environment variables verification**
  ```bash
  # Verify .env.local contains:
  NEXT_PUBLIC_SUPABASE_URL=_______________
  NEXT_PUBLIC_SUPABASE_ANON_KEY=_______________
  ```
  - **Expected:** All variables present and valid
  - **Actual:** _______________

- [ ] **Development server status**
  - Run: `npm run dev`
  - Verify server starts on http://localhost:3000
  - Check console for errors
  - **Expected:** Clean startup with no errors
  - **Actual:** _______________

### Test User Accounts

- [ ] **Create test user account**
  - Email: test@sabiprep.com
  - Password: TestUser123!
  - Complete onboarding
  - **Status:** _______________

- [ ] **Verify user authentication**
  - Login with test credentials
  - Confirm successful authentication
  - Verify redirect to dashboard
  - **Status:** _______________

---

## 2️⃣ Learning Modes Testing

### Practice Mode Testing

**Test Setup:**
- Subject: Mathematics
- Topic: Algebra
- Question Count: 10

#### Core Functionality

- [ ] **Navigate to Practice Mode**
  - Navigate: Subjects → Mathematics → Topics → Algebra → Mode Select → Practice
  - Verify smooth transitions between pages
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify hints are available and functional**
  - Click "Show Hint" button on first question
  - Verify hint displays in expandable card
  - Verify hint content is relevant to question
  - Test hiding hint after showing
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Verify step-by-step solutions display**
  - Answer a question (correctly or incorrectly)
  - Verify "View Solution" button appears
  - Click button and verify detailed solution displays
  - Check solution formatting (steps, explanations, formulas)
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test immediate feedback on answers**
  - Select an answer option
  - Click "Submit Answer" button
  - Verify immediate feedback (correct/incorrect indicator)
  - Verify correct answer is highlighted in green
  - Verify incorrect answer is highlighted in red (if wrong)
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify progress tracking updates correctly**
  - Check progress bar at top of page
  - Answer 5 questions and verify progress updates to "5/10"
  - Verify percentage completion shows correctly
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test navigation between questions**
  - Click "Previous" button (should be disabled on first question)
  - Answer first question, click "Next"
  - Verify navigation to second question
  - Navigate back to first question using "Previous"
  - Verify answer state is preserved
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify no time pressure (untimed)**
  - Confirm no timer is displayed
  - Spend extended time on a question (5+ minutes)
  - Verify no timeout or warning occurs
  - **Severity:** Important
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Practice mode main interface
- [ ] **Screenshot 2:** Hint expanded display
- [ ] **Screenshot 3:** Step-by-step solution view
- [ ] **Screenshot 4:** Progress tracking indicator

---

### Test Mode Testing

**Test Setup:**
- Subject: English
- Topic: Comprehension
- Question Count: 20

#### Core Functionality

- [ ] **Navigate to Test Mode**
  - Navigate: Subjects → English → Topics → Comprehension → Mode Select → Test
  - Verify mode selection page displays Test mode correctly
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify no hints are available**
  - Check that "Show Hint" button is NOT present
  - Verify no hint-related UI elements display
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify question navigator works**
  - Check question navigator grid displays (showing all 20 questions)
  - Click on question #5 from navigator
  - Verify navigation to question 5
  - Verify answered questions show different visual state
  - Verify current question is highlighted
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test answering all questions required before submit**
  - Answer 18 out of 20 questions
  - Attempt to click "Submit Test" button
  - Verify warning message appears: "Please answer all questions"
  - Verify unanswered questions are highlighted in navigator
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify confirmation modal on submit**
  - Answer all 20 questions
  - Click "Submit Test" button
  - Verify confirmation modal appears
  - Verify modal shows question count and warning
  - Test "Cancel" button (should close modal)
  - Test "Confirm Submit" button
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test that answers aren't revealed until completion**
  - During test, verify no feedback on selected answers
  - Verify no correct/incorrect indicators while in progress
  - Verify no solution buttons available
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify scoring at completion**
  - Complete test and submit
  - Verify redirect to results page
  - Verify score displays correctly (e.g., "15/20 - 75%")
  - Verify performance breakdown (correct, incorrect, skipped)
  - Verify detailed review of all questions available
  - **Severity:** Critical
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Test mode interface (no hints visible)
- [ ] **Screenshot 2:** Question navigator grid
- [ ] **Screenshot 3:** Submit confirmation modal
- [ ] **Screenshot 4:** Test results page

---

### Timed Mode Testing

**Test Setup:**
- Subject: Physics
- Topic: Mechanics
- Question Count: 10
- Time Limits to Test: 15s, 30s, 45s, 60s

#### Time Limit Selection

- [ ] **Verify time limit selection UI displays**
  - Navigate to Mode Select page for Timed Mode
  - Verify time limit selector shows 4 options (15s, 30s, 45s, 60s)
  - Verify clear labeling and descriptions
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test each time limit option**
  
  **15 Second Limit:**
  - [ ] Select 15s limit and start session
  - [ ] Verify countdown starts at 15 seconds
  - [ ] Verify timer counts down accurately
  - [ ] Result: _______________
  
  **30 Second Limit:**
  - [ ] Select 30s limit and start session
  - [ ] Verify countdown starts at 30 seconds
  - [ ] Result: _______________
  
  **45 Second Limit:**
  - [ ] Select 45s limit and start session
  - [ ] Verify countdown starts at 45 seconds
  - [ ] Result: _______________
  
  **60 Second Limit:**
  - [ ] Select 60s limit and start session
  - [ ] Verify countdown starts at 60 seconds
  - [ ] Result: _______________

#### Core Functionality

- [ ] **Verify countdown timer displays correctly**
  - Check timer position (top right of question card)
  - Verify timer font size is readable
  - Verify timer updates every second
  - Verify timer format: "0:45" (MM:SS)
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test auto-advance on timeout**
  - Start question with 15s limit
  - Wait without answering
  - Verify timer reaches 0:00
  - Verify automatic advance to next question
  - Verify timeout is recorded as incorrect/skipped
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify timer urgency indicators**
  - Answer quickly to preserve time for testing
  - When timer reaches <10 seconds:
    - Verify timer changes to red color
    - Verify pulsing animation activates
    - Verify urgency is visually clear
  - When timer reaches <5 seconds:
    - Verify increased urgency (faster pulse or brighter red)
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test immediate feedback on answer**
  - Select an answer before timer expires
  - Click "Submit Answer"
  - Verify immediate feedback displays
  - Verify correct answer is shown
  - Verify brief delay before auto-advancing to next question
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify score tracking updates in real-time**
  - Complete 5 questions in timed mode
  - After each question, check score display
  - Verify format: "4/5 Correct" or similar
  - Verify score updates immediately after each answer
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test timer pause scenarios**
  - Verify timer does NOT pause when:
    - Browser loses focus
    - User switches tabs
    - User opens developer tools
  - Verify timer continues running in background
  - **Severity:** Critical
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Time limit selection interface
- [ ] **Screenshot 2:** Active timer at normal state (>10s)
- [ ] **Screenshot 3:** Timer urgency state (<10s, red pulse)
- [ ] **Screenshot 4:** Timed mode results page

---

## 3️⃣ Mode Selection Testing

**Test Setup:** Navigate to any topic's mode selection page

### Mode Selection Page Components

- [ ] **Verify mode selection page displays all three modes**
  - Confirm Practice Mode card is present
  - Confirm Test Mode card is present
  - Confirm Timed Mode card is present
  - Verify cards are properly styled and aligned
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test question count selection**
  - Verify selector shows 4 options: 10, 20, 30, 40
  - Select 10 questions: verify selected state
  - Select 20 questions: verify selected state
  - Select 30 questions: verify selected state
  - Select 40 questions: verify selected state
  - Verify default selection (should be 10)
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Verify mode descriptions are accurate**
  - **Practice Mode:** Check description mentions hints, solutions, self-paced
  - **Test Mode:** Check description mentions exam simulation, no hints
  - **Timed Mode:** Check description mentions speed training, countdown timer
  - Verify icons/badges match mode characteristics
  - **Severity:** Minor
  - **Result:** _______________

- [ ] **Test validation for insufficient questions**
  - Find or create a topic with fewer than 40 questions (e.g., 25 total)
  - Navigate to mode selection for that topic
  - Try to select 40 questions
  - Verify appropriate message: "Only 25 questions available"
  - Verify 40 option is disabled or shows warning
  - Verify lower counts (10, 20) remain available
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Verify time limit selector for Timed Mode**
  - Click on Timed Mode card
  - Verify time limit selector appears (15s/30s/45s/60s)
  - Verify selector is NOT shown for Practice or Test modes
  - Test selecting each time limit option
  - Verify visual feedback for selected time limit
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test session creation for each mode**
  
  **Practice Mode:**
  - [ ] Select 20 questions
  - [ ] Click "Start Practice"
  - [ ] Verify loading state displays
  - [ ] Verify redirect to `/practice/[sessionId]`
  - [ ] Verify session starts correctly
  - [ ] Result: _______________
  
  **Test Mode:**
  - [ ] Select 30 questions
  - [ ] Click "Start Test"
  - [ ] Verify loading state displays
  - [ ] Verify redirect to `/test/[sessionId]`
  - [ ] Verify session starts correctly
  - [ ] Result: _______________
  
  **Timed Mode:**
  - [ ] Select 10 questions and 30s time limit
  - [ ] Click "Start Timed Practice"
  - [ ] Verify loading state displays
  - [ ] Verify redirect to `/timed/[sessionId]`
  - [ ] Verify session starts with correct timer
  - [ ] Result: _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Mode selection page overview
- [ ] **Screenshot 2:** Question count selector
- [ ] **Screenshot 3:** Time limit selector (Timed Mode)
- [ ] **Screenshot 4:** Loading state during session creation

---

## 4️⃣ Navigation System Testing

### Header Component Testing

**Test Locations:** Test from Dashboard, Subjects page, Learning mode pages

- [ ] **Verify logo displays correctly**
  - Check SabiPrep logo/text is visible in header
  - Verify logo size and positioning
  - Verify logo alignment with other header elements
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test back button on sub-pages**
  - Navigate to Topics page (from Subjects)
  - Verify back arrow appears in header
  - Click back arrow
  - Verify navigation to previous page (Subjects)
  - Test from multiple nested pages
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test hamburger menu opens drawer**
  - Click hamburger menu icon (☰) in header
  - Verify NavigationDrawer slides in from left
  - Verify smooth animation (300ms transition)
  - Verify header remains visible and fixed
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify notifications icon displays**
  - Check bell icon (🔔) is present in header
  - Verify icon positioning (right side)
  - Click icon (if functionality implemented)
  - Verify appropriate response
  - **Severity:** Minor
  - **Result:** _______________

- [ ] **Test search button (if implemented)**
  - Check for search icon in header
  - If present, click and verify search overlay/modal opens
  - If not implemented, verify graceful absence
  - **Severity:** Minor
  - **Result:** _______________

- [ ] **Verify sticky header behavior on scroll**
  - Navigate to a long page (e.g., Profile, Analytics)
  - Scroll down 500+ pixels
  - Verify header remains fixed at top
  - Verify no layout shift or jank
  - Verify header maintains proper z-index (above content)
  - **Severity:** Important
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Header on dashboard
- [ ] **Screenshot 2:** Header with back button (sub-page)
- [ ] **Screenshot 3:** Header during scroll (sticky behavior)

---

### Navigation Drawer Testing

**Test Location:** Open drawer from any page using hamburger menu

- [ ] **Test drawer opens/closes smoothly**
  - Click hamburger menu to open
  - Verify smooth slide-in animation from left
  - Verify drawer width is appropriate (e.g., 280px on desktop)
  - Click backdrop or X button to close
  - Verify smooth slide-out animation
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify user profile card displays**
  - Open drawer
  - Check profile card at top shows:
    - User avatar/initials
    - User name
    - User email or level
  - Verify profile card styling and spacing
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test all navigation links work**
  
  **Primary Links:**
  - [ ] Click "Dashboard" → Verify navigation to `/home`
  - [ ] Click "Subjects" → Verify navigation to `/subjects`
  - [ ] Click "Analytics" → Verify navigation to `/analytics`
  - [ ] Click "Achievements" → Verify navigation to `/achievements`
  - [ ] Click "Profile" → Verify navigation to `/profile`
  - [ ] Click "Settings" → Verify navigation to `/settings`
  - [ ] Result: _______________
  
  **Additional Links:**
  - [ ] Click "Daily Challenge" (if present)
  - [ ] Click "Quick Practice" (if present)
  - [ ] Click "Logout" → Verify logout modal/action
  - [ ] Result: _______________

- [ ] **Verify active link highlighting**
  - Navigate to Subjects page
  - Open drawer
  - Verify "Subjects" link has active state (different color/background)
  - Navigate to Analytics
  - Verify "Analytics" link becomes active
  - Verify previous active link returns to normal state
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test collapsible sections (if implemented)**
  - If drawer has collapsible sections (e.g., "Learning", "Account"):
    - Click section header to expand
    - Verify smooth expand animation
    - Verify child links display
    - Click header again to collapse
    - Verify smooth collapse animation
  - **Severity:** Minor
  - **Result:** _______________

- [ ] **Verify ESC key closes drawer**
  - Open drawer
  - Press ESC key on keyboard
  - Verify drawer closes smoothly
  - Verify keyboard focus returns appropriately
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test backdrop prevents interaction**
  - Open drawer
  - Verify semi-transparent backdrop covers main content
  - Try clicking on content behind backdrop
  - Verify clicks are blocked and drawer closes
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify drawer auto-closes on route change**
  - Open drawer
  - Click any navigation link
  - Verify drawer closes automatically
  - Verify smooth transition to new page
  - **Severity:** Important
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Navigation drawer open (full view)
- [ ] **Screenshot 2:** User profile card detail
- [ ] **Screenshot 3:** Active link highlighting
- [ ] **Screenshot 4:** Drawer on mobile device

---

### Bottom Navigation Testing

**Test Location:** Bottom navigation visible on Dashboard and main pages

- [ ] **Verify all 5 tabs display correctly**
  - Check all tab icons and labels:
    1. Home (🏠 icon)
    2. Subjects (📚 icon)
    3. Practice (⚡ icon or similar)
    4. Analytics (📊 icon)
    5. Profile (👤 icon)
  - Verify consistent sizing and spacing
  - Verify icons are clear and recognizable
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test each tab navigates to correct page**
  - Tap/click "Home" → Verify navigation to `/home`
  - Tap/click "Subjects" → Verify navigation to `/subjects`
  - Tap/click "Practice" → Verify navigation to practice page
  - Tap/click "Analytics" → Verify navigation to `/analytics`
  - Tap/click "Profile" → Verify navigation to `/profile`
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify active tab indicator**
  - Navigate to Home
  - Verify "Home" tab shows active state (different color, badge, or underline)
  - Navigate to Subjects
  - Verify "Subjects" tab becomes active
  - Verify previous active tab returns to inactive state
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test responsive behavior on mobile**
  - Switch to mobile viewport (375px width)
  - Verify bottom nav remains visible and functional
  - Verify appropriate spacing for touch targets (minimum 44x44px)
  - Verify icons scale appropriately
  - Verify labels are readable or gracefully hidden
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify fixed position at bottom**
  - Scroll down on a long page
  - Verify bottom nav remains fixed at bottom of viewport
  - Verify bottom nav doesn't overlap content (adequate padding on page)
  - Verify proper z-index (above page content)
  - **Severity:** Critical
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Bottom navigation (all tabs visible)
- [ ] **Screenshot 2:** Active tab indicator
- [ ] **Screenshot 3:** Bottom nav on mobile device
- [ ] **Screenshot 4:** Bottom nav during scroll (fixed position)

---

## 5️⃣ Quick Retry Testing

### From Practice Mode Results

**Test Setup:** Complete a Practice mode session with 10 questions

- [ ] **Complete a Practice session and view results**
  - Complete all 10 questions in Practice mode
  - Verify redirect to results page
  - Verify results summary displays (score, time, etc.)
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify "Ready for More?" section displays**
  - On results page, locate "Ready for More?" or similar section
  - Verify section is prominently placed
  - Verify clear call-to-action buttons are visible
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test "Practice This Topic Again" button**
  - Click "Practice This Topic Again" button
  - Verify loading state displays
  - Verify new session is created with same settings:
    - Same topic
    - Same question count (10)
    - Same mode (Practice)
  - Verify redirect to new practice session
  - Verify different questions are loaded (random selection)
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify same settings preserved (question count)**
  - Complete another Practice session, but with 20 questions
  - View results
  - Click "Practice This Topic Again"
  - Verify new session has 20 questions (not default 10)
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test alternative mode buttons**
  - From Practice results, locate alternative mode buttons:
    - "Try Test Mode" button
    - "Try Timed Mode" button
  - Verify buttons are clearly labeled and styled
  - **Severity:** Important
  - **Result:** _______________
  
  **Try Test Mode:**
  - [ ] Click "Try Test Mode" button
  - [ ] Verify redirect to mode selection or directly to Test mode
  - [ ] Verify same topic
  - [ ] Verify same question count preserved
  - [ ] Result: _______________
  
  **Try Timed Mode:**
  - [ ] Click "Try Timed Mode" button
  - [ ] Verify time limit selector appears (if not previously set)
  - [ ] Verify same topic and question count
  - [ ] Result: _______________

- [ ] **Verify loading states during session creation**
  - Click any retry button
  - Verify loading spinner or skeleton appears
  - Verify button shows "Loading..." or similar state
  - Verify button is disabled during loading
  - Verify smooth transition to new session
  - **Severity:** Important
  - **Result:** _______________

---

### From Test Mode Results

**Test Setup:** Complete a Test mode session with 20 questions

- [ ] **Test retry from Test Mode results**
  - Complete Test mode session (20 questions)
  - View results page
  - Verify "Ready for More?" section displays
  - Click "Take Test Again" or similar button
  - Verify new Test session starts with same settings
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test mode switching from Test results**
  - From Test results, click "Try Practice Mode"
  - Verify switch to Practice mode with same topic and count
  - From Test results, click "Try Timed Mode"
  - Verify time limit selector appears
  - Verify switch to Timed mode after selection
  - **Severity:** Important
  - **Result:** _______________

---

### From Timed Mode Results

**Test Setup:** Complete a Timed mode session with 10 questions at 30s per question

- [ ] **Test retry from Timed Mode results**
  - Complete Timed mode session (10 questions, 30s limit)
  - View results page
  - Verify "Ready for More?" section displays
  - Click "Practice Speed Again" or similar button
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Verify time limit preserved on retry**
  - After clicking retry from Timed results
  - Verify new session starts with SAME time limit (30s)
  - Verify user doesn't have to re-select time limit
  - Verify consistency across retries
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test mode switching from Timed results**
  - From Timed results, test switching to:
    - Practice Mode (verify no timer)
    - Test Mode (verify no timer, exam format)
  - Verify smooth transitions
  - **Severity:** Important
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** "Ready for More?" section on results page
- [ ] **Screenshot 2:** Loading state during session creation
- [ ] **Screenshot 3:** Mode switching buttons
- [ ] **Screenshot 4:** Timed retry with preserved time limit

---

## 6️⃣ User Flow Testing

### Complete Flow: Practice Mode

- [ ] **Login → Subjects → Topics → Mode Select → Learning → Results**
  
  **Step-by-Step:**
  1. [ ] Start at login page, authenticate with test user
  2. [ ] Verify redirect to dashboard
  3. [ ] Click "Subjects" from bottom nav
  4. [ ] Select "Mathematics" subject
  5. [ ] Verify topics list displays for Mathematics
  6. [ ] Select "Algebra" topic
  7. [ ] Verify mode selection page displays
  8. [ ] Select 15 questions
  9. [ ] Click "Start Practice"
  10. [ ] Verify Practice session starts
  11. [ ] Answer all 15 questions
  12. [ ] Verify progress updates throughout
  13. [ ] Complete last question
  14. [ ] Verify automatic redirect to results
  15. [ ] Verify results display correctly
  16. [ ] **Total Time:** _________ minutes
  17. [ ] **Issues Encountered:** _________
  18. [ ] **Severity:** Critical
  19. [ ] **Overall Result:** Pass / Fail

---

### Complete Flow: Test Mode

- [ ] **Login → Subjects → Topics → Mode Select → Learning → Results**
  
  **Step-by-Step:**
  1. [ ] Start at dashboard (already authenticated)
  2. [ ] Navigate to Subjects → English → Comprehension
  3. [ ] Select Test Mode
  4. [ ] Select 20 questions
  5. [ ] Click "Start Test"
  6. [ ] Answer all 20 questions using question navigator
  7. [ ] Verify no immediate feedback during test
  8. [ ] Click "Submit Test"
  9. [ ] Confirm submission in modal
  10. [ ] Verify redirect to results
  11. [ ] Verify detailed results with all answers reviewed
  12. [ ] **Total Time:** _________ minutes
  13. [ ] **Issues Encountered:** _________
  14. [ ] **Severity:** Critical
  15. [ ] **Overall Result:** Pass / Fail

---

### Complete Flow: Timed Mode

- [ ] **Login → Subjects → Topics → Mode Select → Learning → Results**
  
  **Step-by-Step:**
  1. [ ] Navigate to Subjects → Physics → Mechanics
  2. [ ] Select Timed Mode
  3. [ ] Select 10 questions and 45s time limit
  4. [ ] Click "Start Timed Practice"
  5. [ ] Verify timer starts at 45 seconds
  6. [ ] Answer questions under time pressure
  7. [ ] Verify auto-advance on each answer
  8. [ ] Let at least one question timeout (test auto-advance)
  9. [ ] Complete all 10 questions
  10. [ ] Verify automatic redirect to results
  11. [ ] Verify timer statistics in results
  12. [ ] **Total Time:** _________ minutes
  13. [ ] **Issues Encountered:** _________
  14. [ ] **Severity:** Critical
  15. [ ] **Overall Result:** Pass / Fail

---

### Verify Smooth Transitions

- [ ] **Test transition smoothness between all pages**
  - Verify no flashing or loading jank
  - Verify smooth page transitions (fade, slide)
  - Verify consistent loading states
  - Verify no layout shift during navigation
  - **Severity:** Important
  - **Result:** _______________

---

### Test Back Navigation

- [ ] **Test back navigation at each step**
  - From Topics page, use browser back button → Verify return to Subjects
  - From Mode Select, use back button → Verify return to Topics
  - From Active Learning session, use back button → Verify warning/confirmation
  - Test back button preserves state where appropriate
  - **Severity:** Important
  - **Result:** _______________

---

## 7️⃣ Responsive Design Testing

### Mobile Viewport (320px - 768px)

**Test Device:** iPhone 12 (390x844) or equivalent

- [ ] **Test on mobile viewport (375px width)**
  - Resize browser or use device simulation
  - Navigate through all pages
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Navigation Components:**
  - [ ] Verify header is responsive (logo + menu fit within width)
  - [ ] Verify bottom nav is visible and usable
  - [ ] Verify drawer opens full-width or appropriately sized
  - [ ] Verify touch targets are minimum 44x44px
  - [ ] Result: _______________

- [ ] **Learning Mode Pages:**
  - [ ] Verify question cards fit within viewport
  - [ ] Verify answer options are easily tappable
  - [ ] Verify timer (Timed Mode) is clearly visible
  - [ ] Verify progress bar is visible
  - [ ] Verify buttons are full-width or appropriately sized
  - [ ] Result: _______________

- [ ] **Mode Selection Page:**
  - [ ] Verify mode cards stack vertically
  - [ ] Verify question count selector is usable
  - [ ] Verify time limit selector is usable
  - [ ] Result: _______________

- [ ] **Results Page:**
  - [ ] Verify score summary is readable
  - [ ] Verify question review cards fit within viewport
  - [ ] Verify all buttons are accessible
  - [ ] Result: _______________

---

### Tablet Viewport (768px - 1024px)

**Test Device:** iPad (768x1024) or equivalent

- [ ] **Test on tablet viewport (768px width)**
  - Resize browser or use device simulation
  - Navigate through all pages
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Layout Adaptations:**
  - [ ] Verify 2-column layouts where appropriate (e.g., mode selection)
  - [ ] Verify increased spacing and padding
  - [ ] Verify navigation components adapt appropriately
  - [ ] Verify touch targets remain adequate
  - [ ] Result: _______________

- [ ] **Learning Mode Pages:**
  - [ ] Verify question cards use available space well
  - [ ] Verify question navigator (Test Mode) fits comfortably
  - [ ] Verify no unnecessary wrapping or overflow
  - [ ] Result: _______________

---

### Desktop Viewport (>1024px)

**Test Device:** Desktop browser (1920x1080)

- [ ] **Test on desktop viewport (1280px width)**
  - Resize browser to desktop size
  - Navigate through all pages
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Layout Optimizations:**
  - [ ] Verify max-width containers prevent excessive stretching
  - [ ] Verify 3-4 column layouts where appropriate
  - [ ] Verify adequate use of whitespace
  - [ ] Verify hover states on interactive elements
  - [ ] Result: _______________

- [ ] **Navigation:**
  - [ ] Verify drawer sizing is appropriate (not full-width)
  - [ ] Verify header components are well-spaced
  - [ ] Verify bottom nav (if visible) doesn't waste space
  - [ ] Result: _______________

---

### Verify Readability and Accessibility

- [ ] **Test across all viewports:**
  - Verify font sizes are readable (minimum 16px for body text)
  - Verify sufficient color contrast (WCAG AA minimum)
  - Verify touch targets are adequate (44x44px minimum)
  - Verify keyboard navigation works (Tab, Enter, Esc)
  - Verify focus indicators are visible
  - **Severity:** Important
  - **Result:** _______________

---

### Test Touch Interactions on Mobile

- [ ] **Touch-specific interactions:**
  - Test tap on buttons (verify no hover issues)
  - Test swipe gestures (if implemented)
  - Test scrolling is smooth
  - Test no accidental double-tap zoom
  - Verify drawer swipe-to-close (if implemented)
  - **Severity:** Important
  - **Result:** _______________

#### Screenshot Placeholders

- [ ] **Screenshot 1:** Mobile viewport (375px) - Dashboard
- [ ] **Screenshot 2:** Mobile viewport - Learning mode
- [ ] **Screenshot 3:** Tablet viewport (768px) - Mode selection
- [ ] **Screenshot 4:** Desktop viewport (1280px) - Results page

---

## 8️⃣ Error Handling Testing

### Insufficient Questions

- [ ] **Test with insufficient questions in topic**
  - Find or create a topic with only 15 questions
  - Navigate to mode selection for that topic
  - Attempt to select 20 questions
  - **Expected:** Warning message: "This topic only has 15 questions available"
  - **Actual:** _______________
  - Verify 10 question option works, 20+ disabled
  - **Severity:** Important
  - **Result:** _______________

---

### Network Errors

- [ ] **Test network error during session creation**
  - Open browser DevTools → Network tab
  - Set network throttling to "Offline"
  - Attempt to start a new learning session
  - **Expected:** User-friendly error message: "Unable to create session. Please check your connection."
  - **Actual:** _______________
  - Verify retry button or option appears
  - Re-enable network and retry
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test network error during question submission**
  - Start a learning session
  - Answer a question
  - Set network to offline before submitting
  - Attempt to submit answer
  - **Expected:** Error message with retry option
  - **Actual:** _______________
  - Verify answer is not lost
  - **Severity:** Critical
  - **Result:** _______________

---

### Invalid Session ID

- [ ] **Test invalid session ID in URL**
  - Manually navigate to: `/practice/invalid-session-id-12345`
  - **Expected:** 404 page or error message: "Session not found"
  - **Actual:** _______________
  - Verify option to return to dashboard or subjects
  - **Severity:** Important
  - **Result:** _______________

---

### Error Messages User-Friendliness

- [ ] **Verify error messages are user-friendly**
  - Review all error messages encountered during testing
  - Verify messages are:
    - Clear and non-technical
    - Actionable (tell user what to do next)
    - Appropriately styled (not scary red text)
    - Include helpful suggestions
  - **Examples of good messages:**
    - ✅ "Oops! We couldn't load that session. Let's try again."
    - ✅ "You need at least 10 questions to start. This topic only has 5."
    - ❌ "Error 500: Internal Server Error" (too technical)
    - ❌ "Undefined error" (not helpful)
  - **Severity:** Important
  - **Result:** _______________

---

### Timeout Handling in Timed Mode

- [ ] **Test timeout handling edge cases**
  - Start Timed Mode with 15s limit
  - Let timer expire without answering
  - Verify graceful auto-advance
  - Verify timeout is recorded correctly
  - Verify no crashes or freezes
  - **Severity:** Critical
  - **Result:** _______________

- [ ] **Test rapid timeout scenario**
  - Start Timed Mode with 15s limit
  - Don't answer any of the first 5 questions (let all timeout)
  - Verify system handles multiple rapid timeouts
  - Verify session continues normally
  - **Severity:** Important
  - **Result:** _______________

---

## 9️⃣ Performance Testing

### Page Load Times

- [ ] **Verify page load times are acceptable**
  
  **Test with Chrome DevTools Performance tab:**
  
  - [ ] **Dashboard:** Load time < 2 seconds
    - Result: _________ ms
  
  - [ ] **Subjects Page:** Load time < 2 seconds
    - Result: _________ ms
  
  - [ ] **Topics Page:** Load time < 2 seconds
    - Result: _________ ms
  
  - [ ] **Mode Selection:** Load time < 1.5 seconds
    - Result: _________ ms
  
  - [ ] **Practice Mode:** Load time < 2 seconds
    - Result: _________ ms
  
  - [ ] **Results Page:** Load time < 2 seconds
    - Result: _________ ms
  
  - **Overall Performance:** Pass / Fail
  - **Issues:** _______________
  - **Severity:** Important

---

### Large Question Sets

- [ ] **Test with large question sets (40 questions)**
  - Create or find a session with 40 questions
  - Start Practice Mode
  - Monitor performance during session:
    - Question loading speed
    - Navigation responsiveness
    - Memory usage (DevTools Memory tab)
  - **Severity:** Important
  - **Result:** _______________

- [ ] **Test question navigator with 40 questions**
  - Start Test Mode with 40 questions
  - Open question navigator
  - Verify all 40 questions display in grid
  - Verify smooth scrolling within navigator
  - Verify no lag when clicking distant question numbers
  - **Severity:** Important
  - **Result:** _______________

---

### Memory Leaks

- [ ] **Check for memory leaks during long sessions**
  - Open Chrome DevTools → Performance Monitor
  - Start a 40-question Timed Mode session
  - Complete entire session while monitoring:
    - JS Heap size (should not grow excessively)
    - DOM nodes count (should remain stable)
    - Event listeners count (should not accumulate)
  - **Expected:** Memory usage remains stable or grows minimally
  - **Actual:** _______________
  - **Severity:** Important
  - **Result:** _______________

---

### Animations and Transitions

- [ ] **Verify smooth animations and transitions**
  - Test common animations:
    - Page transitions (should be 60fps)
    - Drawer slide animation
    - Modal open/close
    - Button hover states
    - Progress bar updates
    - Timer countdown
  - Use DevTools Performance tab to record
  - Look for frame drops or jank
  - **Expected:** Consistent 60fps during animations
  - **Actual:** _______________
  - **Severity:** Important
  - **Result:** _______________

---

### Network Performance

- [ ] **Test on slow connection (3G)**
  - Enable 3G throttling in DevTools
  - Navigate through typical user flow
  - Verify:
    - Loading states display appropriately
    - Images load progressively or show placeholders
    - User can still interact (not blocked)
    - Timeout errors are handled gracefully
  - **Severity:** Important
  - **Result:** _______________

---

## 🔟 Database Verification

### Session Creation

- [ ] **Verify sessions are created with correct data**
  - Create a Practice session (20 questions)
  - Check Supabase Dashboard → learning_sessions table
  - Verify record exists with:
    - `user_id`: Correct user ID
    - `topic_id`: Correct topic ID
    - `mode`: 'practice'
    - `total_questions`: 20
    - `completed`: false
    - `time_limit_seconds`: NULL (for Practice mode)
  - **Severity:** Critical
  - **Result:** _______________

---

### Time Limit Storage

- [ ] **Check time_limit_seconds is stored for Timed Mode**
  - Create a Timed session with 30s limit
  - Check learning_sessions table
  - Verify `time_limit_seconds` column = 30
  - Create sessions with different time limits (15s, 45s, 60s)
  - Verify each is stored correctly
  - **Severity:** Critical
  - **Result:** _______________

---

### Session Answers

- [ ] **Verify session answers are recorded correctly**
  - Start a Practice session
  - Answer first question correctly
  - Check session_answers table
  - Verify record with:
    - `session_id`: Matches current session
    - `question_id`: Correct question ID
    - `selected_answer`: Your selected answer (A, B, C, or D)
    - `is_correct`: true
    - `time_taken`: Appropriate value (or NULL for Practice)
  - Answer second question incorrectly
  - Verify `is_correct`: false
  - **Severity:** Critical
  - **Result:** _______________

---

### Completion Status

- [ ] **Check completion status updates properly**
  - Complete a full session (all questions answered)
  - Check learning_sessions table
  - Verify `completed`: true
  - Verify `score`: Correct percentage (e.g., 75.0 for 15/20)
  - Verify `completed_at`: Timestamp is recent
  - **Severity:** Critical
  - **Result:** _______________

---

## 📊 Issues Log

Use this section to document any issues found during testing.

### Issue Template

```
**Issue #[Number]**
- **Title:** [Brief description]
- **Severity:** Critical / Important / Minor
- **Location:** [Page/Component where issue occurs]
- **Steps to Reproduce:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Expected Behavior:** [What should happen]
- **Actual Behavior:** [What actually happens]
- **Screenshots:** [Link or attach]
- **Browser/Device:** [e.g., Chrome 120 / iPhone 12]
- **Status:** Open / In Progress / Resolved
```

---

### Critical Issues

_Document any critical issues here_

---

### Important Issues

_Document any important issues here_

---

### Minor Issues

_Document any minor issues here_

---

## ✅ Testing Summary

### Completion Checklist

- [ ] All pre-testing setup completed
- [ ] All learning modes tested (Practice, Test, Timed)
- [ ] All navigation components tested
- [ ] Quick retry functionality verified
- [ ] All user flows completed successfully
- [ ] Responsive design verified on 3+ viewports
- [ ] Error handling tested thoroughly
- [ ] Performance benchmarks met
- [ ] Database verification completed
- [ ] All critical issues resolved
- [ ] All important issues documented
- [ ] Testing report compiled

---

### Test Statistics

- **Total Test Cases:** ~150
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____
- **Pass Rate:** _____% 
- **Testing Duration:** _____ hours
- **Tester Name:** _____________
- **Testing Date:** _____________

---

### Sign-Off

**QA Lead:** _________________ Date: _______

**Product Owner:** _________________ Date: _______

**Development Lead:** _________________ Date: _______

---

## 🛠️ Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Timer not appearing in Timed Mode
**Solution:**
1. Verify time_limit_seconds is set in session creation
2. Check component is receiving time limit prop
3. Check browser console for errors
4. Verify session record in database has time_limit_seconds value

#### Issue: Navigation drawer not opening
**Solution:**
1. Check hamburger menu button is clickable
2. Verify no z-index conflicts
3. Check drawer state management (useState/context)
4. Verify drawer component is rendered

#### Issue: Session not creating (stuck on loading)
**Solution:**
1. Check network tab for failed API requests
2. Verify Supabase credentials in .env.local
3. Check if topic has sufficient questions
4. Verify database connection

#### Issue: Back button not appearing
**Solution:**
1. Verify route structure (should be nested route)
2. Check Header component logic for back button
3. Verify navigation history exists

#### Issue: Bottom navigation not staying fixed
**Solution:**
1. Check CSS: `position: fixed; bottom: 0;`
2. Verify no conflicting styles
3. Check z-index is high enough (e.g., 50)
4. Verify not hidden by other fixed elements

---

## 📚 Additional Resources

- **LEARNING_MODES.md:** Detailed documentation on learning modes
- **ARCHITECTURE.md:** System architecture overview
- **API_REFERENCE.md:** API endpoint documentation
- **DESIGN.md:** UI/UX design guidelines
- **USER_GUIDE.md:** End-user documentation

---

## 📝 Notes

- This checklist should be reviewed and updated after each major feature release
- All testers should read the entire checklist before starting testing
- Use a copy of this checklist for each testing cycle
- Archive completed checklists for reference
- Report critical issues immediately, don't wait for full testing completion

---

**End of Testing Checklist**
