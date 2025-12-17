# SabiPrep - Magic UI Pro Redesign Plan

**Version**: 1.0  
**Date**: December 17, 2025  
**Status**: Planning Phase  
**Design System**: Magic UI Pro Inspired

---

## Executive Summary

This document outlines a comprehensive UI/UX redesign of the SabiPrep education platform, transforming it from its current clean, minimal design to a **dark, high-contrast, animated aesthetic** inspired by Magic UI Pro. The redesign maintains all existing functionality while elevating the visual experience with:

- **Dark-first color scheme** with vibrant accent colors
- **Gradient-rich components** with subtle glows and borders
- **Smooth animations** and micro-interactions
- **Bento grid layouts** for dashboard elements
- **Glass morphism effects** for navigation and overlays
- **Bold typography** with generous spacing

**Key Principle**: Transform the visual layer without breaking existing functionality - this is a design evolution, not a rebuild.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Magic UI Pro Design System](#magic-ui-pro-design-system)
3. [Screen-by-Screen Redesign](#screen-by-screen-redesign)
4. [Component Library Specifications](#component-library-specifications)
5. [Implementation Phases](#implementation-phases)
6. [Migration Strategy](#migration-strategy)
7. [Testing & Quality Assurance](#testing--quality-assurance)

---

## Current State Analysis

### Existing Design Patterns

**Color Palette:**
- Primary: Indigo (#4F46E5, #6366F1)
- Accent: Cyan/Teal (#06B6D4, #22D3EE)
- Background: Light gray (#F9FAFB, #FFFFFF)
- Text: Dark gray (#111827, #6B7280)

**Component Style:**
- Rounded corners (rounded-2xl, 16px)
- Soft shadows (shadow-sm, shadow-lg)
- Clean borders (border-gray-200)
- Minimal animations (hover states, transitions)

**Layout Patterns:**
- Grid-based layouts (grid-cols-2, grid-cols-3)
- Card-based content organization
- Bottom navigation for mobile
- Sticky headers with back buttons

### Pain Points & Opportunities

**Visual Hierarchy:**
- ❌ Current: Subtle contrast, similar weights
- ✅ Target: Bold contrast, clear focal points

**Engagement:**
- ❌ Current: Static, minimal motion
- ✅ Target: Dynamic, animated interactions

**Modern Appeal:**
- ❌ Current: Safe, corporate feel
- ✅ Target: Cutting-edge, exciting aesthetic

**Information Density:**
- ❌ Current: Spread out, lots of whitespace
- ✅ Target: Efficient bento grids, smart grouping

---

## Magic UI Pro Design System

### Color Palette

```css
/* Dark Backgrounds */
--bg-primary: #020817;      /* slate-950 - Main background */
--bg-secondary: #0f172a;    /* slate-900 - Card backgrounds */
--bg-tertiary: #1e293b;     /* slate-800 - Elevated surfaces */

/* Vibrant Accents */
--accent-cyan: #22d3ee;     /* cyan-400 - Primary actions */
--accent-violet: #6366F1;   /* indigo-500 - Secondary actions */
--accent-purple: #a855f7;   /* purple-500 - Tertiary */
--accent-pink: #ec4899;     /* pink-500 - Highlights */

/* Gradients */
--gradient-primary: linear-gradient(135deg, #6366F1 0%, #a855f7 100%);
--gradient-accent: linear-gradient(135deg, #22d3ee 0%, #6366F1 100%);
--gradient-warm: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%);

/* Glows */
--glow-cyan: 0 0 20px rgba(34, 211, 238, 0.3);
--glow-violet: 0 0 20px rgba(99, 102, 241, 0.3);
--glow-purple: 0 0 20px rgba(168, 85, 247, 0.3);

/* Text */
--text-primary: #f8fafc;    /* slate-50 */
--text-secondary: #cbd5e1;  /* slate-300 */
--text-muted: #64748b;      /* slate-500 */

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1);
--border-medium: rgba(255, 255, 255, 0.2);
--border-strong: rgba(255, 255, 255, 0.3);
```

### Typography

```css
/* Font Families */
--font-display: 'Plus Jakarta Sans', 'Inter', sans-serif;
--font-body: 'Inter', system-ui, sans-serif;

/* Sizes - Large & Bold */
--text-hero: 3.5rem;        /* 56px - Hero headings */
--text-h1: 2.5rem;          /* 40px - Page titles */
--text-h2: 2rem;            /* 32px - Section titles */
--text-h3: 1.5rem;          /* 24px - Card titles */
--text-body-lg: 1.125rem;   /* 18px - Large body */
--text-body: 1rem;          /* 16px - Regular body */
--text-sm: 0.875rem;        /* 14px - Small text */
--text-xs: 0.75rem;         /* 12px - Captions */

/* Weights */
--font-black: 900;
--font-bold: 700;
--font-semibold: 600;
--font-medium: 500;
--font-regular: 400;
```

### Spacing System

```css
/* Generous Breathing Room */
--space-xs: 0.5rem;    /* 8px */
--space-sm: 1rem;      /* 16px */
--space-md: 1.5rem;    /* 24px */
--space-lg: 2rem;      /* 32px */
--space-xl: 3rem;      /* 48px */
--space-2xl: 4rem;     /* 64px */
--space-3xl: 6rem;     /* 96px */

/* Component Padding */
--padding-card: 1.5rem;      /* 24px */
--padding-section: 2.5rem;   /* 40px */
```

### Border Radius

```css
--radius-sm: 0.5rem;    /* 8px - Small elements */
--radius-md: 0.75rem;   /* 12px - Cards */
--radius-lg: 1rem;      /* 16px - Large cards */
--radius-xl: 1.5rem;    /* 24px - Hero elements */
--radius-full: 9999px;  /* Pills & circles */
```

### Animation Tokens

```css
/* Durations */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;

/* Easings */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* Keyframes */
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

---

## Screen-by-Screen Redesign

### 1. Home Dashboard (`app/(dashboard)/home/page.tsx`)

**Current State:**
- Light background with card grid
- Streak card with gradient
- Quick stats in 3-column grid
- Subject cards in 2-column grid

**Magic UI Redesign:**

```tsx
// Layout Structure
<div className="min-h-screen bg-slate-950 pb-24">
  {/* Hero Section with Gradient Mesh Background */}
  <div className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
    <div className="absolute inset-0" style={{
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
    }} />
    
    {/* Welcome Section */}
    <div className="relative container-app py-10">
      <h1 className="font-display text-5xl font-black text-white mb-2">
        Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
          {userName}
        </span>
      </h1>
      <p className="text-slate-400 text-lg">Ready to level up your learning?</p>
    </div>
  </div>

  {/* Bento Grid Layout */}
  <div className="container-app space-y-6 -mt-6">
    {/* Streak Card - Large Feature */}
    <MagicCard className="relative overflow-hidden p-8 bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-orange-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/50">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-6xl font-black text-white mb-1">{stats?.currentStreak || 0}</div>
              <div className="text-orange-200 font-semibold">Day Streak 🔥</div>
            </div>
          </div>
          <p className="text-slate-300">
            {(stats?.currentStreak || 0) > 0 ? 'Keep the momentum going!' : 'Start your streak today!'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-sm mb-1">Next milestone</div>
          <div className="text-4xl font-bold text-white">{Math.ceil(((stats?.currentStreak || 0) + 1) / 7) * 7}</div>
          <div className="text-slate-400 text-sm">days</div>
        </div>
      </div>
    </MagicCard>

    {/* Stats Bento Grid - 3 columns */}
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        icon={<Target className="w-6 h-6" />}
        value={stats?.questionsAnswered || 0}
        label="Questions"
        gradient="from-cyan-500 to-blue-500"
        glow="shadow-cyan-500/50"
      />
      <StatCard
        icon={<TrendingUp className="w-6 h-6" />}
        value={`${Math.round(stats?.accuracy || 0)}%`}
        label="Accuracy"
        gradient="from-emerald-500 to-teal-500"
        glow="shadow-emerald-500/50"
      />
      <StatCard
        icon={<Clock className="w-6 h-6" />}
        value={`${Math.floor((stats?.studyTimeMinutes || 0) / 60)}h`}
        label="Study Time"
        gradient="from-violet-500 to-purple-500"
        glow="shadow-violet-500/50"
      />
    </div>

    {/* Quick Actions - Pill-shaped buttons */}
    <div className="flex gap-3 overflow-x-auto hide-scrollbar">
      {quickActions.map((action) => (
        <MagicButton
          key={action.href}
          variant="pill"
          className="flex-shrink-0 bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20"
        >
          <action.icon className="w-5 h-5" />
          <span>{action.label}</span>
        </MagicButton>
      ))}
    </div>

    {/* Learning Modes - Large Cards with Hover Effects */}
    <div>
      <h2 className="font-display text-2xl font-bold text-white mb-4">Choose Your Mode</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {learningModes.map((mode) => (
          <MagicCard
            key={mode.href}
            className="group relative overflow-hidden p-6 bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <mode.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">{mode.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{mode.description}</p>
              <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${mode.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
            </div>
          </MagicCard>
        ))}
      </div>
    </div>

    {/* Subjects Grid - Compact Cards */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold text-white">Subjects</h2>
        <MagicButton variant="ghost" size="sm">
          See All <ChevronRight className="w-4 h-4" />
        </MagicButton>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {subjects.slice(0, 4).map((subject) => (
          <MagicCard
            key={subject.id}
            className="p-4 bg-slate-900/50 border-slate-700 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/20 transition-all"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{subject.icon || '📚'}</div>
              <h3 className="font-semibold text-white text-sm mb-1">{subject.name}</h3>
              <p className="text-slate-500 text-xs">{subject.total_questions} questions</p>
              {subjectProgress && (
                <MagicBadge variant="success" className="mt-2">
                  {Math.round(subjectProgress.accuracy_percentage || 0)}%
                </MagicBadge>
              )}
            </div>
          </MagicCard>
        ))}
      </div>
    </div>
  </div>
</div>
```

**Key Tailwind Classes:**
- Background: `bg-slate-950`, `bg-slate-900/50`
- Borders: `border-slate-700`, `border-cyan-500/50`
- Text: `text-white`, `text-slate-400`, `text-slate-300`
- Gradients: `bg-gradient-to-br from-cyan-500 to-blue-500`
- Shadows: `shadow-lg shadow-cyan-500/20`
- Hover: `hover:-translate-y-1`, `hover:scale-110`

---

### 2. Subjects Page (`app/(dashboard)/subjects/page.tsx`)

**Magic UI Redesign:**

```tsx
<div className="min-h-screen bg-slate-950 pb-24">
  {/* Frosted Glass Header */}
  <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800">
    <div className="container-app py-4">
      <div className="flex items-center gap-3 mb-4">
        <MagicButton variant="ghost" size="icon">
          <ArrowLeft className="w-5 h-5" />
        </MagicButton>
        <div>
          <h1 className="font-display text-3xl font-black text-white">All Subjects</h1>
          <p className="text-slate-400">Choose your learning path</p>
        </div>
      </div>
      
      {/* Search with Glow Effect */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search subjects..."
          className="w-full px-4 py-3 pl-12 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
      </div>
    </div>
  </header>

  <div className="container-app py-6">
    {/* Subjects Grid with Stagger Animation */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredSubjects.map((subject, idx) => (
        <MagicCard
          key={subject.id}
          className="group relative overflow-hidden p-6 bg-slate-900/50 border-slate-700 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-300 hover:-translate-y-2 animate-enter"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative">
            {/* Subject Icon with Glow */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-6xl group-hover:scale-110 transition-transform">
                {subject.icon || '📚'}
              </div>
              {subject.exam_types && (
                <div className="flex flex-wrap gap-1">
                  {subject.exam_types.slice(0, 3).map((exam) => (
                    <MagicBadge key={exam} variant="info" size="sm">
                      {exam}
                    </MagicBadge>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Info */}
            <h3 className="font-display text-2xl font-bold text-white mb-2">
              {subject.name}
            </h3>
            {subject.description && (
              <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                {subject.description}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">{subject.total_questions} questions</span>
              </div>
              {subjectProgress && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">
                    {subjectProgress.accuracy}%
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar with Glow */}
            {subjectProgress && (
              <div className="mt-4">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/50 transition-all duration-500"
                    style={{ width: `${subjectProgress.accuracy}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {subjectProgress.topicsStarted} topics · {subjectProgress.questionsAttempted} questions
                </p>
              </div>
            )}
          </div>
        </MagicCard>
      ))}
    </div>
  </div>
</div>
```

---

### 3. Analytics Page (`app/(dashboard)/analytics/page.tsx`)

**Magic UI Redesign:**

```tsx
<div className="min-h-screen bg-slate-950 pb-24">
  <header className="backdrop-blur-xl bg-slate-950/80 border-b border-slate-800">
    <div className="container-app py-4">
      <h1 className="font-display text-3xl font-black text-white mb-1">
        Your Analytics 📊
      </h1>
      <p className="text-slate-400">Track your learning journey</p>
    </div>
  </header>

  <div className="container-app py-6 space-y-6">
    {/* Big Number Stats - Bento Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Target className="w-8 h-8" />}
        value={stats.questionsAnswered}
        label="Questions"
        sublabel="Answered"
        gradient="from-cyan-500 to-blue-500"
        className="col-span-1"
      />
      <StatCard
        icon={<TrendingUp className="w-8 h-8" />}
        value={`${Math.round(stats.accuracy)}%`}
        label="Accuracy"
        sublabel="Rate"
        gradient="from-emerald-500 to-teal-500"
        className="col-span-1"
      />
      <StatCard
        icon={<Clock className="w-8 h-8" />}
        value={`${Math.floor(stats.studyTimeMinutes / 60)}h`}
        label="Study"
        sublabel="Time"
        gradient="from-violet-500 to-purple-500"
        className="col-span-1"
      />
      <StatCard
        icon={<Award className="w-8 h-8" />}
        value={stats.currentStreak}
        label="Streak"
        sublabel="Days"
        gradient="from-orange-500 to-pink-500"
        className="col-span-1"
      />
    </div>

    {/* Weekly Activity Chart - Large Feature */}
    <MagicCard className="p-6 bg-slate-900/50 border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-display text-xl font-bold text-white">Weekly Activity</h3>
      </div>
      
      <div className="flex items-end justify-between gap-2 h-64">
        {analytics.weeklyActivity.map((day, idx) => {
          const height = (day.questionsAnswered / maxActivity) * 100;
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-3">
              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-xl transition-all duration-500 ${
                    day.questionsAnswered > 0
                      ? 'bg-gradient-to-t from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/80'
                      : 'bg-slate-800'
                  }`}
                  style={{ 
                    height: `${Math.max(height, 5)}%`,
                    animationDelay: `${idx * 100}ms`
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-white">{dayName}</p>
                <p className="text-xs text-slate-500">{day.questionsAnswered}</p>
              </div>
            </div>
          );
        })}
      </div>
    </MagicCard>

    {/* Subject Performance - Cards with Progress Rings */}
    <MagicCard className="p-6 bg-slate-900/50 border-slate-700">
      <h3 className="font-display text-xl font-bold text-white mb-6">Subject Performance</h3>
      <div className="space-y-4">
        {analytics.subjectPerformance.map((perf) => {
          const subject = subjects.find(s => s.id === perf.subjectId);
          if (!subject) return null;

          return (
            <div key={perf.subjectId} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-violet-500/50 transition-all">
              <div className="text-4xl">{subject.icon || '📚'}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{subject.name}</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{Math.round(perf.accuracy)}%</p>
                    <p className="text-xs text-slate-500">
                      {perf.questionsCorrect} / {perf.questionsAttempted}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      perf.accuracy >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/50' :
                      perf.accuracy >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/50' :
                      'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50'
                    }`}
                    style={{ width: `${perf.accuracy}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </MagicCard>

    {/* Strengths & Weaknesses - Side by Side */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Strengths */}
      <MagicCard className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-display text-xl font-bold text-white">Your Strengths</h3>
        </div>
        {analytics.strengths.length > 0 ? (
          <div className="space-y-3">
            {analytics.strengths.slice(0, 3).map((topicId) => {
              const topic = topics.get(topicId);
              if (!topic) return null;

              return (
                <div key={topicId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-emerald-500/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-white">{topic.name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400">Keep practicing to identify your strengths!</p>
        )}
      </MagicCard>

      {/* Weaknesses */}
      <MagicCard className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/50">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-display text-xl font-bold text-white">Areas to Improve</h3>
        </div>
        {analytics.weaknesses.length > 0 ? (
          <div className="space-y-3">
            {analytics.weaknesses.slice(0, 3).map((topicId) => {
              const topic = topics.get(topicId);
              if (!topic) return null;

              return (
                <div key={topicId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-orange-500/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/50">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-white">{topic.name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400">No weak areas identified yet!</p>
        )}
      </MagicCard>
    </div>
  </div>
</div>
```

---

### 4. Profile Page (`app/(dashboard)/profile/page.tsx`)

**Magic UI Redesign:**

```tsx
<div className="min-h-screen bg-slate-950 pb-24">
  <header className="backdrop-blur-xl bg-slate-950/80 border-b border-slate-800">
    <div className="container-app py-4">
      <h1 className="font-display text-3xl font-black text-white">Profile</h1>
      <p className="text-slate-400">Manage your account</p>
    </div>
  </header>

  <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
    {/* Profile Header Card with Gradient Border */}
    <MagicCard className="relative overflow-hidden p-6 bg-slate-900/50 border-slate-700">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
      
      <div className="relative flex items-start gap-4">
        {/* Avatar with Glow */}
        <div className="relative">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-violet-500/50 shadow-lg shadow-violet-500/50"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/50">
              <span className="text-4xl font-black text-white">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-cyan-500 to-violet-500 text-white rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-cyan-500/50">
            <Edit className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h2 className="font-display text-3xl font-black text-white mb-2">{user.full_name}</h2>
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>
          {user.grade && (
            <MagicBadge variant="info" className="bg-violet-500/20 text-violet-300 border-violet-500/30">
              {user.grade}
            </MagicBadge>
          )}
        </div>
      </div>

      {/* Joined Date */}
      <div className="relative mt-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">
            Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    </MagicCard>

    {/* Stats Grid - Compact Bento */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon="🎯"
        value={stats?.questionsAnswered || 0}
        label="Questions"
        compact
      />
      <StatCard
        icon="📊"
        value={`${Math.round(stats?.accuracy || 0)}%`}
        label="Accuracy"
        compact
      />
      <StatCard
        icon="🔥"
        value={stats?.currentStreak || 0}
        label="Streak"
        compact
      />
      <StatCard
        icon="🏆"
        value={achievements.length}
        label="Achievements"
        compact
      />
    </div>

    {/* Menu Items - Elevated Cards */}
    <div>
      <h2 className="font-display text-xl font-bold text-white mb-4">Account</h2>
      <MagicCard className="divide-y divide-slate-800 bg-slate-900/50 border-slate-700">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="text-slate-400 group-hover:text-cyan-400 transition-colors">
                {item.icon}
              </div>
              <span className="font-medium text-white">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && (
                <MagicBadge 
                  variant={item.badge === 'Coming Soon' ? 'warning' : 'info'}
                  size="sm"
                >
                  {item.badge}
                </MagicBadge>
              )}
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
          </button>
        ))}
      </MagicCard>
    </div>

    {/* Premium Card - Gradient Feature */}
    <MagicCard className="relative overflow-hidden p-6 bg-gradient-to-br from-violet-500/20 to-pink-500/20 border-violet-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div className="relative flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold text-white mb-2">Free Plan</h3>
          <p className="text-slate-300 mb-4">
            Upgrade to Premium for unlimited access
          </p>
          <MagicBadge variant="warning" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            Coming Soon
          </MagicBadge>
        </div>
        <div className="text-6xl">👑</div>
      </div>
    </MagicCard>

    {/* Logout Button */}
    <MagicButton
      variant="danger"
      size="full"
      leftIcon={<LogOut className="w-5 h-5" />}
      onClick={handleLogout}
      className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
    >
      Logout
    </MagicButton>
  </div>
</div>
```

---

### 5. Learning Screens (Practice/Test/Timed)

**Practice Mode Redesign:**

```tsx
<div className="min-h-screen bg-slate-950">
  {/* Frosted Header with Progress */}
  <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800">
    <div className="container-app py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MagicButton variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </MagicButton>
          <div>
            <p className="text-slate-400 text-sm">{subject?.name} · {topic?.name}</p>
            <h1 className="font-display text-xl font-bold text-white">Practice Mode</h1>
          </div>
        </div>
        <MagicBadge variant="info" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
          {currentIndex + 1} / {questions.length}
        </MagicBadge>
      </div>

      {/* Animated Progress Bar with Glow */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/50 transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  </header>

  <div className="container-app py-6 space-y-6">
    {/* Question Card with Elevated Design */}
    <MagicCard className="p-6 bg-slate-900/50 border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <MagicBadge variant="neutral" className="bg-slate-800 text-slate-300 border-slate-700">
          Question {currentIndex + 1}
        </MagicBadge>
        <div className="flex gap-2">
          {currentQuestion.passage_id && (
            <MagicBadge variant="info" size="sm">📖 Passage</MagicBadge>
          )}
          {currentQuestion.difficulty && (
            <MagicBadge
              variant={
                currentQuestion.difficulty === 'Easy' ? 'success' :
                currentQuestion.difficulty === 'Medium' ? 'warning' : 'error'
              }
              size="sm"
            >
              {currentQuestion.difficulty}
            </MagicBadge>
          )}
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-lg text-white font-medium leading-relaxed">
          {currentQuestion.question_text}
        </p>
      </div>
    </MagicCard>

    {/* Options with Hover Glow */}
    <div className="grid grid-cols-1 gap-3">
      {options.map((key) => {
        const optionText = currentQuestion[`option_${key.toLowerCase()}`];
        const isSelected = selectedAnswer === key;
        const isCorrect = key === currentQuestion.correct_answer;
        const showResult = isAnswered;

        return (
          <button
            key={key}
            onClick={() => !isAnswered && handleAnswerSelect(key)}
            disabled={isAnswered}
            className={`
              group relative w-full p-5 rounded-2xl text-left transition-all duration-300
              ${!showResult && !isSelected && 'bg-slate-900/50 border-2 border-slate-700 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5'}
              ${!showResult && isSelected && 'bg-cyan-500/10 border-2 border-cyan-500 shadow-lg shadow-cyan-500/30'}
              ${showResult && isCorrect && 'bg-emerald-500/10 border-2 border-emerald-500 shadow-lg shadow-emerald-500/30'}
              ${showResult && isSelected && !isCorrect && 'bg-red-500/10 border-2 border-red-500 shadow-lg shadow-red-500/30'}
              ${showResult && !isSelected && !isCorrect && 'bg-slate-900/30 border-2 border-slate-800'}
              ${isAnswered && 'cursor-not-allowed'}
            `}
          >
            <div className="flex items-start gap-4">
              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 transition-all
                  ${!showResult && isSelected && 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/50'}
                  ${!showResult && !isSelected && 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}
                  ${showResult && isCorrect && 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50'}
                  ${showResult && isSelected && !isCorrect && 'bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/50'}
                  ${showResult && !isSelected && !isCorrect && 'bg-slate-800 text-slate-600'}
                `}
              >
                {showResult && isCorrect ? (
                  <Check className="w-5 h-5" />
                ) : showResult && isSelected && !isCorrect ? (
                  <X className="w-5 h-5" />
                ) : (
                  key
                )}
              </div>
              <span className="flex-1 text-white font-medium">{optionText}</span>
            </div>
          </button>
        );
      })}
    </div>

    {/* Hint Card with Glow */}
    {showHint && currentQuestion.hint && (
      <MagicCard className="p-5 bg-amber-500/10 border-amber-500/30 animate-enter">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/50">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white mb-2">💡 Hint</p>
            <p className="text-slate-300 leading-relaxed">{currentQuestion.hint}</p>
          </div>
        </div>
      </MagicCard>
    )}

    {/* Solution Card */}
    {showSolution && currentQuestion.explanation && (
      <MagicCard 
        className={`p-5 animate-enter ${
          selectedAnswer === currentQuestion.correct_answer
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-cyan-500/10 border-cyan-500/30'
        }`}
      >
        <div className="flex gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
            selectedAnswer === currentQuestion.correct_answer
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/50'
              : 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-500/50'
          }`}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white mb-2">
              {selectedAnswer === currentQuestion.correct_answer ? '✅ Correct!' : '📖 Explanation'}
            </p>
            <p className="text-slate-300 leading-relaxed mb-3">{currentQuestion.explanation}</p>
            <p className="text-sm text-slate-400">
              Correct answer: <span className="font-semibold text-white">{currentQuestion.correct_answer}</span>
            </p>
          </div>
        </div>
      </MagicCard>
    )}

    {/* Navigation Buttons */}
    <div className="flex gap-3">
      <MagicButton
        variant="secondary"
        size="md"
        leftIcon={<ChevronLeft className="w-5 h-5" />}
        onClick={handlePrevious}
        disabled={currentIndex === 0}
      >
        Previous
      </MagicButton>
      <MagicButton
        variant="primary"
        size="full"
        rightIcon={<ChevronRight className="w-5 h-5" />}
        onClick={handleNext}
        disabled={!isAnswered}
        className="bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 shadow-lg shadow-cyan-500/30"
      >
        {isLastQuestion ? 'Complete Session' : 'Next Question'}
      </MagicButton>
    </div>

    {/* Progress Summary - Bento Style */}
    <MagicCard className="p-5 bg-slate-900/50 border-slate-700">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-3xl font-black text-white mb-1">{answeredQuestions.size}</p>
          <p className="text-xs text-slate-400">Answered</p>
        </div>
        <div>
          <p className="text-3xl font-black text-emerald-400 mb-1">{correctAnswers}</p>
          <p className="text-xs text-slate-400">Correct</p>
        </div>
        <div>
          <p className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-1">
            {answeredQuestions.size > 0 ? Math.round((correctAnswers / answeredQuestions.size) * 100) : 0}%
          </p>
          <p className="text-xs text-slate-400">Accuracy</p>
        </div>
      </div>
    </MagicCard>
  </div>
</div>
```

---

### 6. Auth Screens (Login/Signup)

**Login Page Redesign:**

```tsx
<div className="min-h-screen bg-slate-950 flex flex-col">
  {/* Gradient Mesh Background */}
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
  </div>

  {/* Header */}
  <header className="relative z-10 p-4">
    <div className="container-app">
      <div className="flex items-center justify-between">
        <MagicButton variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </MagicButton>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-xl text-white">SabiPrep</span>
        </Link>
      </div>
    </div>
  </header>

  {/* Main Content */}
  <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-md">
      <MagicCard className="p-8 bg-slate-900/50 backdrop-blur-xl border-slate-700">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-cyan-500/50 animate-float">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-3xl font-black text-white mb-2">
            Welcome back!
          </h1>
          <p className="text-slate-400">
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Google Sign In */}
        <MagicButton
          variant="secondary"
          size="full"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="mb-6 bg-slate-800/50 border-slate-700 hover:border-slate-600"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </MagicButton>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-900 text-slate-500">or continue with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-enter">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 pl-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all"
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pl-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-400">Remember me</span>
            </label>
            <Link 
              href="/forgot-password" 
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <MagicButton
            type="submit"
            variant="primary"
            size="full"
            isLoading={loading}
            leftIcon={<LogIn className="w-5 h-5" />}
            className="bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 shadow-lg shadow-cyan-500/30"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </MagicButton>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-slate-400">
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Create account
            </Link>
          </p>
        </div>
      </MagicCard>

      {/* Trust Indicators */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500">
          Join thousands of students preparing for WAEC, JAMB & NECO
        </p>
      </div>
    </div>
  </main>
</div>
```

---

### 7. Navigation Components

**Bottom Navigation Redesign:**

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
  {/* Frosted Glass Background */}
  <div className="backdrop-blur-xl bg-slate-950/80 border-t border-slate-800">
    {/* Pill Container */}
    <div className="flex items-center justify-center px-4 py-3">
      <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-full p-2 shadow-2xl">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center px-6 py-2 rounded-full transition-all duration-300
                ${active 
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/50' 
                  : 'hover:bg-slate-800/50'
                }
              `}
            >
              {/* Glow Effect on Active */}
              {active && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 blur-xl opacity-50" />
              )}
              
              <span className={`relative transition-all ${active ? 'scale-110' : ''}`}>
                {React.cloneElement(item.icon, {
                  className: `w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`
                })}
              </span>
              <span
                className={`
                  relative text-[10px] mt-1 font-semibold
                  ${active ? 'text-white' : 'text-slate-500'}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  </div>
</nav>
```

**Header Redesign:**

```tsx
<header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800">
  <div className="container-app">
    <div className="flex items-center justify-between h-16">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {shouldShowBack ? (
          <MagicButton variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </MagicButton>
        ) : (
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-black text-lg text-white hidden sm:block">
              SabiPrep
            </span>
          </Link>
        )}

        {title && (
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-lg text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <MagicButton variant="ghost" size="icon" className="hidden sm:flex">
          <Search className="w-5 h-5" />
        </MagicButton>

        {/* Notifications with Glow */}
        <MagicButton variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-pink-500 to-red-500 rounded-full ring-2 ring-slate-950 shadow-lg shadow-pink-500/50" />
        </MagicButton>

        {/* Menu */}
        <MagicButton variant="ghost" size="icon" onClick={() => setDrawerOpen(true)}>
          <Menu className="w-5 h-5" />
        </MagicButton>
      </div>
    </div>
  </div>
</header>
```

---

## Component Library Specifications

### Core Components

#### 1. MagicCard

**Purpose**: Base card component with gradient borders, subtle glows, and hover effects.

**Props:**
```typescript
interface MagicCardProps {
  variant?: 'default' | 'elevated' | 'gradient' | 'glass';
  glow?: boolean;
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'orange';
  children: React.ReactNode;
  className?: string;
}
```

**Implementation:**
```tsx
// components/magic/MagicCard.tsx
export function MagicCard({
  variant = 'default',
  glow = false,
  glowColor = 'cyan',
  children,
  className,
  ...props
}: MagicCardProps) {
  const variants = {
    default: 'bg-slate-900/50 border border-slate-700',
    elevated: 'bg-slate-900/70 border border-slate-600 shadow-2xl',
    gradient: 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700',
    glass: 'bg-slate-900/30 backdrop-blur-xl border border-slate-700/50',
  };

  const glowColors = {
    cyan: 'hover:shadow-cyan-500/20 hover:border-cyan-500/50',
    violet: 'hover:shadow-violet-500/20 hover:border-violet-500/50',
    emerald: 'hover:shadow-emerald-500/20 hover:border-emerald-500/50',
    orange: 'hover:shadow-orange-500/20 hover:border-orange-500/50',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        variants[variant],
        glow && 'hover:shadow-2xl',
        glow && glowColors[glowColor],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

**Tailwind Classes:**
- Base: `rounded-2xl transition-all duration-300`
- Background: `bg-slate-900/50`
- Border: `border border-slate-700`
- Hover: `hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20`

---

#### 2. MagicButton

**Purpose**: Pill-shaped buttons with gradients, glows, and smooth animations.

**Props:**
```typescript
interface MagicButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'pill';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'full';
  glow?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  children: React.ReactNode;
}
```

**Implementation:**
```tsx
// components/magic/MagicButton.tsx
export function MagicButton({
  variant = 'primary',
  size = 'md',
  glow = false,
  leftIcon,
  rightIcon,
  isLoading,
  children,
  className,
  ...props
}: MagicButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-600 hover:to-violet-600 shadow-lg shadow-cyan-500/30',
    secondary: 'bg-slate-800/50 border border-slate-700 text-white hover:bg-slate-800 hover:border-slate-600',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50',
    pill: 'bg-slate-800/50 border border-slate-700 text-white hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 rounded-full',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    icon: 'p-2 w-10 h-10',
    full: 'w-full px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:-translate-y-0.5 active:translate-y-0',
        variants[variant],
        sizes[size],
        glow && 'hover:shadow-2xl',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {leftIcon && <span>{leftIcon}</span>}
          {children}
          {rightIcon && <span>{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
```

**Tailwind Classes:**
- Primary: `bg-gradient-to-r from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/30`
- Secondary: `bg-slate-800/50 border border-slate-700`
- Hover: `hover:-translate-y-0.5 hover:shadow-2xl`

---

#### 3. MagicBadge

**Purpose**: Pill-shaped tags with subtle backgrounds and borders.

**Props:**
```typescript
interface MagicBadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  children: React.ReactNode;
}
```

**Implementation:**
```tsx
// components/magic/MagicBadge.tsx
export function MagicBadge({
  variant = 'primary',
  size = 'md',
  glow = false,
  children,
  className,
  ...props
}: MagicBadgeProps) {
  const variants = {
    primary: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    info: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  };

  const glowColors = {
    primary: 'shadow-cyan-500/50',
    success: 'shadow-emerald-500/50',
    warning: 'shadow-amber-500/50',
    error: 'shadow-red-500/50',
    info: 'shadow-violet-500/50',
    neutral: 'shadow-slate-500/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-all',
        variants[variant],
        sizes[size],
        glow && 'shadow-lg',
        glow && glowColors[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

**Tailwind Classes:**
- Base: `rounded-full border transition-all`
- Primary: `bg-cyan-500/20 text-cyan-300 border-cyan-500/30`
- Glow: `shadow-lg shadow-cyan-500/50`

---

#### 4. StatCard

**Purpose**: Display large numbers with icons, gradients, and glows.

**Props:**
```typescript
interface StatCardProps {
  icon: React.ReactNode | string;
  value: string | number;
  label: string;
  sublabel?: string;
  gradient?: string;
  glow?: string;
  compact?: boolean;
}
```

**Implementation:**
```tsx
// components/magic/StatCard.tsx
export function StatCard({
  icon,
  value,
  label,
  sublabel,
  gradient = 'from-cyan-500 to-blue-500',
  glow = 'shadow-cyan-500/50',
  compact = false,
  className,
}: StatCardProps) {
  return (
    <MagicCard className={cn('p-5 text-center', className)}>
      {/* Icon */}
      <div className={`mx-auto mb-3 ${compact ? 'text-3xl' : 'w-12 h-12 rounded-xl bg-gradient-to-br ' + gradient + ' flex items-center justify-center shadow-lg ' + glow}`}>
        {typeof icon === 'string' ? (
          <span className={compact ? '' : 'text-white'}>{icon}</span>
        ) : (
          <span className="text-white">{icon}</span>
        )}
      </div>

      {/* Value */}
      <p className={`font-black text-white mb-1 ${compact ? 'text-2xl' : 'text-4xl'}`}>
        {value}
      </p>

      {/* Label */}
      <p className="text-xs text-slate-400">{label}</p>
      {sublabel && (
        <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>
      )}
    </MagicCard>
  );
}
```

**Tailwind Classes:**
- Icon Container: `w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/50`
- Value: `text-4xl font-black text-white`
- Label: `text-xs text-slate-400`

---

#### 5. ProgressRing

**Purpose**: Circular progress indicator with glow effect.

**Props:**
```typescript
interface ProgressRingProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'violet' | 'emerald' | 'orange';
  showValue?: boolean;
}
```

**Implementation:**
```tsx
// components/magic/ProgressRing.tsx
export function ProgressRing({
  value,
  size = 'md',
  color = 'cyan',
  showValue = true,
}: ProgressRingProps) {
  const sizes = {
    sm: { width: 60, stroke: 4 },
    md: { width: 80, stroke: 6 },
    lg: { width: 120, stroke: 8 },
  };

  const colors = {
    cyan: { gradient: 'from-cyan-500 to-blue-500', glow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' },
    violet: { gradient: 'from-violet-500 to-purple-500', glow: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' },
    emerald: { gradient: 'from-emerald-500 to-teal-500', glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
    orange: { gradient: 'from-orange-500 to-pink-500', glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' },
  };

  const { width, stroke } = sizes[size];
  const { gradient, glow } = colors[color];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={width} className={glow}>
        {/* Background Circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={stroke}
        />
        {/* Progress Circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${width / 2} ${width / 2})`}
          className="transition-all duration-500"
        />
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className={`text-${color}-500`} stopColor="currentColor" />
            <stop offset="100%" className={`text-${color}-600`} stopColor="currentColor" />
          </linearGradient>
        </defs>
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold">{value}%</span>
        </div>
      )}
    </div>
  );
}
```

---

#### 6. BentoGrid

**Purpose**: Flexible grid layout for dashboard elements.

**Props:**
```typescript
interface BentoGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}
```

**Implementation:**
```tsx
// components/magic/BentoGrid.tsx
export function BentoGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: BentoGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  );
}
```

**Tailwind Classes:**
- Base: `grid gap-4`
- Columns: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

### Component File Structure

```
components/
├── magic/
│   ├── MagicCard.tsx
│   ├── MagicButton.tsx
│   ├── MagicBadge.tsx
│   ├── StatCard.tsx
│   ├── ProgressRing.tsx
│   ├── BentoGrid.tsx
│   └── index.ts
├── common/
│   ├── Card.tsx (legacy - keep for migration)
│   ├── Button.tsx (legacy - keep for migration)
│   ├── Badge.tsx (legacy - keep for migration)
│   └── ...
└── navigation/
    ├── Header.tsx (update with Magic UI)
    ├── BottomNav.tsx (update with Magic UI)
    └── NavigationDrawer.tsx (update with Magic UI)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Set up design tokens and core infrastructure.

**Tasks:**
1. Update [`tailwind.config.ts`](tailwind.config.ts:1)
   - Add dark color palette
   - Add gradient utilities
   - Add glow shadow utilities
   - Add animation keyframes

2. Update [`app/globals.css`](app/globals.css:1)
   - Add CSS custom properties
   - Add utility classes
   - Add animation definitions

3. Create Magic UI component directory
   - Set up `components/magic/` folder
   - Create index file for exports

**Files to Modify:**
- [`tailwind.config.ts`](tailwind.config.ts:1) - Add Magic UI tokens
- [`app/globals.css`](app/globals.css:1) - Add custom styles
- Create `components/magic/index.ts`

**Estimated Time**: 2-3 days

---

### Phase 2: Core Components (Week 1-2)

**Goal**: Build the Magic UI component library.

**Tasks:**
1. Create MagicCard component
   - Implement variants
   - Add glow effects
   - Add hover animations

2. Create MagicButton component
   - Implement variants
   - Add gradient backgrounds
   - Add loading states

3. Create MagicBadge component
   - Implement variants
   - Add glow option

4. Create StatCard component
   - Implement with gradients
   - Add icon support

5. Create ProgressRing component
   - SVG-based circular progress
   - Gradient strokes

6. Create BentoGrid component
   - Flexible grid system

**Files to Create:**
- `components/magic/MagicCard.tsx`
- `components/magic/MagicButton.tsx`
- `components/magic/MagicBadge.tsx`
- `components/magic/StatCard.tsx`
- `components/magic/ProgressRing.tsx`
- `components/magic/BentoGrid.tsx`

**Estimated Time**: 4-5 days

---

### Phase 3: Layout & Navigation (Week 2)

**Goal**: Redesign navigation components with Magic UI.

**Tasks:**
1. Update Header component
   - Frosted glass background
   - Gradient logo
   - Glow effects on icons

2. Update BottomNav component
   - Pill-shaped container
   - Active state with gradient
   - Glow effects

3. Update NavigationDrawer component
   - Dark background with gradient
   - Organized sections
   - Smooth animations

**Files to Modify:**
- [`components/navigation/Header.tsx`](components/navigation/Header.tsx:1)
- [`components/common/BottomNav.tsx`](components/common/BottomNav.tsx:1)
- `components/navigation/NavigationDrawer.tsx`

**Estimated Time**: 2-3 days

---

### Phase 4: Dashboard Screens (Week 3)

**Goal**: Redesign main dashboard screens.

**Tasks:**
1. Update Home page
   - Hero section with gradient mesh
   - Bento grid layout
   - Animated cards

2. Update Subjects page
   - Stagger animations
   - Hover effects
   - Progress bars with glow

3. Update Analytics page
   - Big number stats
   - Animated charts
   - Strengths/weaknesses cards

4. Update Profile page
   - Gradient profile card
   - Stats bento grid
   - Premium card

**Files to Modify:**
- [`app/(dashboard)/home/page.tsx`](app/(dashboard)/home/page.tsx:1)
- [`app/(dashboard)/subjects/page.tsx`](app/(dashboard)/subjects/page.tsx:1)
- [`app/(dashboard)/analytics/page.tsx`](app/(dashboard)/analytics/page.tsx:1)
- [`app/(dashboard)/profile/page.tsx`](app/(dashboard)/profile/page.tsx:1)
- [`app/(dashboard)/topics/[subjectId]/page.tsx`](app/(dashboard)/topics/[subjectId]/page.tsx:1)

**Estimated Time**: 5-6 days

---

### Phase 5: Learning Screens (Week 4)

**Goal**: Redesign learning mode screens.

**Tasks:**
1. Update Practice mode
   - Dark question cards
   - Animated options
   - Glow on correct/incorrect

2. Update Test mode
   - Question navigator with indicators
   - Progress tracking
   - Submit modal

3. Update Timed mode
   - Circular timer with glow
   - Auto-advance animations
   - Score tracking

4. Update Mode Select page
   - Large mode cards
   - Hover effects
   - Configuration options

5. Update Results page
   - Celebration animations
   - Score breakdown
   - Recommendations

**Files to Modify:**
- [`app/(learning)/practice/[sessionId]/page.tsx`](app/(learning)/practice/[sessionId]/page.tsx:1)
- [`app/(learning)/test/[sessionId]/page.tsx`](app/(learning)/test/[sessionId]/page.tsx:1)
- `app/(learning)/timed/[sessionId]/page.tsx`
- [`app/(learning)/mode-select/[topicId]/page.tsx`](app/(learning)/mode-select/[topicId]/page.tsx:1)
- `app/(learning)/results/[sessionId]/page.tsx`
- [`components/common/QuestionDisplay.tsx`](components/common/QuestionDisplay.tsx:1)

**Estimated Time**: 6-7 days

---

### Phase 6: Auth Screens (Week 5)

**Goal**: Redesign authentication screens.

**Tasks:**
1. Update Login page
   - Gradient mesh background
   - Frosted glass card
   - Animated logo

2. Update Signup page
   - Similar to login
   - Multi-step form
   - Progress indicator

3. Update Onboarding page
   - Animated slides
   - Gradient backgrounds
   - Smooth transitions

**Files to Modify:**
- [`app/(auth)/login/page.tsx`](app/(auth)/login/page.tsx:1)
- [`app/(auth)/signup/page.tsx`](app/(auth)/signup/page.tsx:1)
- `app/(auth)/onboarding/page.tsx`

**Estimated Time**: 3-4 days

---

### Phase 7: Polish & Animations (Week 5-6)

**Goal**: Add micro-interactions and polish.

**Tasks:**
1. Add stagger animations
   - Card grids
   - List items
   - Navigation items

2. Add hover effects
   - Scale transforms
   - Glow intensification
   - Color transitions

3. Add loading states
   - Skeleton screens
   - Shimmer effects
   - Progress indicators

4. Add success/error states
   - Toast notifications
   - Inline feedback
   - Celebration animations

**Files to Create/Modify:**
- `components/magic/animations.ts`
- `components/magic/Toast.tsx`
- `components/magic/Skeleton.tsx`
- Update all screen files with animations

**Estimated Time**: 4-5 days

---

### Phase 8: Documentation (Week 6)

**Goal**: Document the new design system.

**Tasks:**
1. Create component documentation
   - Props and usage
   - Examples
   - Best practices

2. Create design guidelines
   - Color usage
   - Typography scale
   - Spacing system

3. Create migration guide
   - Component mapping
   - Breaking changes
   - Migration steps

**Files to Create:**
- `MAGIC_UI_COMPONENTS.md`
- `MAGIC_UI_GUIDELINES.md`
- `MIGRATION_GUIDE.md`

**Estimated Time**: 2-3 days

---

## Migration Strategy

### Approach: Gradual Migration

**Principle**: Migrate screen by screen, maintaining backward compatibility.

### Step-by-Step Process

1. **Phase 1: Parallel Development**
   - Keep existing components in `components/common/`
   - Build new components in `components/magic/`
   - No breaking changes to existing screens

2. **Phase 2: Screen-by-Screen Migration**
   - Start with low-traffic screens (Profile, Settings)
   - Test thoroughly before moving to high-traffic screens
   - Keep rollback option available

3. **Phase 3: Component Replacement**
   - Once all screens migrated, deprecate old components
   - Update imports across codebase
   - Remove legacy components

### Migration Checklist

**Before Starting:**
- [ ] Create feature branch: `feature/magic-ui-redesign`
- [ ] Set up design tokens in Tailwind config
- [ ] Create Magic UI component directory
- [ ] Document current component API

**During Migration:**
- [ ] Build new component
- [ ] Test component in isolation
- [ ] Update one screen at a time
- [ ] Test screen functionality
- [ ] Check mobile responsiveness
- [ ] Verify accessibility
- [ ] Get design approval
- [ ] Merge to main branch

**After Migration:**
- [ ] Update documentation
- [ ] Remove legacy components
- [ ] Clean up unused styles
- [ ] Optimize bundle size

### Rollback Plan

If issues arise:
1. Revert to previous commit
2. Identify problematic component
3. Fix in isolation
4. Re-deploy with fix

---

## Testing & Quality Assurance

### Visual Regression Testing

**Tools:**
- Percy or Chromatic for screenshot comparison
- Manual testing on multiple devices

**Test Cases:**
1. **Component Level**
   - All variants render correctly
   - Hover states work
   - Animations are smooth
   - Responsive behavior

2. **Screen Level**
   - Layout matches design
   - All interactions work
   - Data displays correctly
   - Loading states work

3. **Cross-Browser**
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

4. **Device Testing**
   - iPhone (iOS Safari)
   - Android (Chrome)
   - iPad (Safari)
   - Desktop (1920x1080, 1366x768)

### Performance Testing

**Metrics to Monitor:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.5s
- Cumulative Layout Shift (CLS) < 0.1

**Tools:**
- Lighthouse
- WebPageTest
- Chrome DevTools Performance tab

### Accessibility Testing

**Requirements:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation works
- Screen reader compatible
- Color contrast ratios meet standards

**Tools:**
- axe DevTools
- WAVE
- Lighthouse Accessibility audit

### Testing Checklist

**Component Testing:**
- [ ] All props work as expected
- [ ] Variants render correctly
- [ ] Hover/focus states work
- [ ] Animations are smooth
- [ ] Responsive on all breakpoints
- [ ] Accessible (keyboard, screen reader)
- [ ] No console errors

**Screen Testing:**
- [ ] Layout matches design
- [ ] All features work
- [ ] Data loads correctly
- [ ] Error states handled
- [ ] Loading states work
- [ ] Navigation works
- [ ] Mobile responsive
- [ ] Cross-browser compatible

**Integration Testing:**
- [ ] User flows work end-to-end
- [ ] State management works
- [ ] API calls succeed
- [ ] Authentication works
- [ ] Data persistence works

---

## Success Metrics

### User Engagement
- [ ] Session duration increases by 20%
- [ ] Bounce rate decreases by 15%
- [ ] User retention improves by 25%

### Performance
- [ ] Page load time < 2s
- [ ] Lighthouse score > 90
- [ ] No layout shifts (CLS < 0.1)

### Visual Quality
- [ ] Design approval from stakeholders
- [ ] Positive user feedback
- [ ] Brand consistency maintained

---

## Next Steps

1. **Review & Approval**
   - Present plan to stakeholders
   - Get design approval
   - Allocate resources

2. **Setup**
   - Create feature branch
   - Set up development environment
   - Install necessary dependencies

3. **Kickoff**
   - Start Phase 1: Foundation
   - Set up weekly check-ins
   - Track progress against timeline

---

## Appendix

### Color Reference

```css
/* Dark Backgrounds */
slate-950: #020817
slate-900: #0f172a
slate-800: #1e293b

/* Accent Colors */
cyan-400: #22d3ee
cyan-500: #06b6d4
violet-500: #6366F1
purple-500: #a855f7
emerald-500: #10b981
orange-500: #f97316
red-500: #ef4444

/* Text Colors */
slate-50: #f8fafc
slate-300: #cbd5e1
slate-400: #94a3b8
slate-500: #64748b
```

### Gradient Reference

```css
/* Primary Gradients */
from-cyan-500 to-violet-500
from-violet-500 to-purple-500
from-emerald-500 to-teal-500
from-orange-500 to-pink-500

/* Background Gradients */
from-violet-500/10 via-transparent to-cyan-500/10
from-slate-900 to-slate-800
```

### Shadow Reference

```css
/* Glows */
shadow-lg shadow-cyan-500/20
shadow-lg shadow-cyan-500/30
shadow-lg shadow-cyan-500/50

shadow-lg shadow-violet-500/20
shadow-lg shadow-emerald-500/20
shadow-lg shadow-orange-500/20
```

---

**Document Version**: 1.0  
**Last Updated**: December 17, 2025  
**Status**: Ready for Implementation  
**Estimated Timeline**: 6 weeks  
**Team Size**: 2-3 developers + 1 designer

---

## Questions or Feedback?

For questions about this redesign plan, please contact the development team or create an issue in the project repository.