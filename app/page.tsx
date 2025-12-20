'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Clock,
  Target,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Trophy,
  BarChart3,
  Zap,
  ChevronRight,
  Play,
  Shield,
  Users,
  Star,
  TrendingUp,
  Brain,
  Timer,
  Award,
  Lightbulb,
  Rocket,
} from 'lucide-react';

// Stats data
const stats = [
  { value: '10,000+', label: 'Questions', sublabel: 'Curated' },
  { value: '15+', label: 'Subjects', sublabel: 'Covered' },
  { value: '95%', label: 'Pass Rate', sublabel: 'Success' },
  { value: '24/7', label: 'Access', sublabel: 'Anytime' },
];

// Exam boards
const examBoards = [
  { name: 'WAEC', description: 'West African Examinations Council', color: 'from-emerald-500 to-teal-500' },
  { name: 'JAMB', description: 'Joint Admissions Board', color: 'from-blue-500 to-indigo-500' },
  { name: 'NECO', description: 'National Examinations Council', color: 'from-purple-500 to-violet-500' },
  { name: 'GCE', description: 'General Certificate Exam', color: 'from-amber-500 to-orange-500' },
];

// Learning modes
const learningModes = [
  {
    icon: BookOpen,
    title: 'Practice',
    description: 'Learn with hints, explanations, and instant feedback. Perfect for building understanding.',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Target,
    title: 'Test',
    description: 'Simulate real exam conditions. No hints, just you and the questions.',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Timer,
    title: 'Timed',
    description: 'Race against the clock. Build speed and confidence for exam day.',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// Benefits
const benefits = [
  {
    icon: Lightbulb,
    title: 'Detailed Explanations',
    description: 'Every question comes with clear, step-by-step explanations to deepen your understanding.',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Visual analytics show your strengths, weaknesses, and improvement over time.',
  },
  {
    icon: Trophy,
    title: 'Achievements & Streaks',
    description: 'Stay motivated with daily streaks, XP points, and unlockable achievements.',
  },
  {
    icon: Brain,
    title: 'Smart Learning',
    description: 'Intelligent question selection focuses on your weak areas for faster improvement.',
  },
  {
    icon: Zap,
    title: 'Instant Feedback',
    description: 'Know immediately if you\'re right or wrong with detailed answer breakdowns.',
  },
  {
    icon: Shield,
    title: 'Exam-Ready Questions',
    description: 'Questions sourced from actual past papers to match real exam difficulty.',
  },
];

// How it works
const howItWorks = [
  {
    step: '01',
    title: 'Choose Your Subject',
    description: 'Select from 15+ subjects covering all major exam topics.',
  },
  {
    step: '02',
    title: 'Pick Your Mode',
    description: 'Practice for learning, Test for assessment, or Timed for speed.',
  },
  {
    step: '03',
    title: 'Learn & Improve',
    description: 'Answer questions, review explanations, and track your progress.',
  },
];

// Testimonials
const testimonials = [
  {
    name: 'Adaeze O.',
    role: 'JAMB Candidate, 2024',
    content: 'I scored 312 in JAMB after practicing on SabiPrep for just 3 months. The explanations helped me understand concepts I struggled with in class.',
    score: '312/400',
    avatar: 'AO',
  },
  {
    name: 'Chukwuemeka I.',
    role: 'WAEC Student',
    content: 'The timed mode really helped me manage my time during the actual exam. I finished all sections without rushing.',
    score: 'A1 in 7 subjects',
    avatar: 'CI',
  },
  {
    name: 'Fatima A.',
    role: 'NECO Candidate',
    content: 'SabiPrep made studying fun with the achievements and streaks. I actually looked forward to practicing every day!',
    score: '8 Distinctions',
    avatar: 'FA',
  },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/home');
    }
  }, [user, isLoading, router]);

  // Show loading while checking auth
  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-xl shadow-indigo-500/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-xl group-hover:shadow-indigo-500/30 transition-all duration-300 group-hover:scale-105">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-slate-900">
                SabiPrep
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="group px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full 
                           shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 
                           hover:scale-105 active:scale-100"
              >
                <span className="flex items-center gap-1.5">
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-violet-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-30" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="py-16 sm:py-20 lg:py-28 text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/80 
                            text-slate-700 rounded-full text-sm font-medium mb-6 sm:mb-8 shadow-sm
                            animate-enter">
              <div className="flex -space-x-1.5">
                {['🎓', '📚', '🏆'].map((emoji, i) => (
                  <span key={i} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs border-2 border-white">
                    {emoji}
                  </span>
                ))}
              </div>
              <span>Trusted by <strong>10,000+</strong> Nigerian students</span>
            </div>

            {/* Main headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 
                           tracking-tight mb-6 animate-enter stagger-1 max-w-4xl mx-auto">
              Ace Your{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Exams
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-indigo-200" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 6C50 0 150 12 200 6" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
              {' '}With Confidence
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-600 mb-8 sm:mb-10 max-w-2xl mx-auto animate-enter stagger-2 leading-relaxed">
              Master <strong>WAEC, JAMB, NECO & GCE</strong> with thousands of past questions, 
              intelligent practice modes, and real-time progress tracking.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-enter stagger-3">
              <Link
                href="/signup"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white 
                           bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-xl shadow-indigo-500/25 
                           hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-105"
              >
                <Play className="w-5 h-5" />
                Start Practicing Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 
                           bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-full 
                           transition-all duration-300 shadow-sm hover:shadow-md"
              >
                See How It Works
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-200/60 animate-enter stagger-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center px-2">
                  <p className="font-display text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating UI Preview */}
          <div className="relative -mt-4 sm:-mt-8 pb-16 sm:pb-24 animate-enter stagger-5">
            <div className="relative max-w-4xl mx-auto">
              {/* Glossy glass card */}
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200/60">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="px-4 py-1 bg-white rounded-full text-xs text-slate-500 border border-slate-200">
                      sabiprep.com
                    </div>
                  </div>
                </div>
                
                {/* Dashboard preview */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  {/* Header bar */}
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-white font-semibold">Good morning, Adaeze! 👋</div>
                        <div className="text-slate-400 text-sm">Ready to practice?</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium flex items-center gap-1.5">
                        <span className="text-amber-400">🔥</span> 12 Day Streak
                      </div>
                    </div>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    {[
                      { label: 'Questions', value: '1,247', icon: BookOpen, color: 'from-cyan-500 to-blue-500' },
                      { label: 'Accuracy', value: '84%', icon: Target, color: 'from-emerald-500 to-teal-500' },
                      { label: 'XP Points', value: '3,840', icon: Zap, color: 'from-violet-500 to-purple-500' },
                    ].map((stat, i) => {
                      const Icon = stat.icon;
                      return (
                        <div key={i} className="p-3 sm:p-4 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2 shadow-lg`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-white font-bold text-lg sm:text-xl">{stat.value}</div>
                          <div className="text-slate-400 text-xs">{stat.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Learning gateway card */}
                  <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-indigo-500/20">
                    <div>
                      <div className="text-white/80 text-sm font-medium mb-1">🎯 Continue Learning</div>
                      <div className="text-white font-bold text-lg">Mathematics — Quadratic Equations</div>
                    </div>
                    <button className="w-full sm:w-auto px-5 py-2.5 bg-white text-indigo-600 rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all">
                      Resume Practice →
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="hidden md:block absolute -left-4 top-1/3 animate-float">
                <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">Correct Answer!</span>
                </div>
              </div>
              
              <div className="hidden md:block absolute -right-4 top-1/4 animate-float" style={{ animationDelay: '1s' }}>
                <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">+50 XP Earned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== EXAM BOARDS SECTION ========== */}
      <section className="py-16 sm:py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-3">
              Comprehensive Coverage
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              All Major Nigerian Exams
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {examBoards.map((board, index) => (
              <div
                key={board.name}
                className="group relative p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl 
                           hover:border-transparent hover:shadow-xl transition-all duration-300
                           overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${board.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${board.color} flex items-center justify-center mb-4 
                                  shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-white font-bold text-lg">{board.name.charAt(0)}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-slate-900 mb-1">
                    {board.name}
                  </h3>
                  <p className="text-sm text-slate-500 hidden sm:block">
                    {board.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== UNIFIED LEARNING GATEWAY SECTION ========== */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 
                            rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>One Gateway, Three Modes</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Learn Your Way
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose your subject, then pick the perfect mode for where you are in your learning journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {learningModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <div
                  key={mode.title}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-8 
                             hover:shadow-2xl hover:border-transparent transition-all duration-500
                             hover:-translate-y-2"
                >
                  {/* Glossy gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 
                                  group-hover:opacity-[0.03] transition-opacity duration-500 rounded-2xl`} />
                  
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.gradient} 
                                    flex items-center justify-center mb-6 shadow-lg 
                                    group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">
                      {mode.title} Mode
                    </h3>
                    
                    <p className="text-slate-600 leading-relaxed mb-6">
                      {mode.description}
                    </p>
                    
                    <div className={`inline-flex items-center gap-2 text-sm font-medium 
                                    text-${mode.color}-600 group-hover:gap-3 transition-all`}>
                      <span>Get started</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Single gateway CTA */}
          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white 
                         bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-xl shadow-indigo-500/25 
                         hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-105"
            >
              <Rocket className="w-5 h-5" />
              Enter the Learning Gateway
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS SECTION ========== */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-wide mb-3">
              Simple & Effective
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              How SabiPrep Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get started in minutes and begin your journey to exam success.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-indigo-200 to-transparent z-0" 
                       style={{ width: 'calc(100% - 2rem)' }} />
                )}
                
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl 
                                  bg-gradient-to-br from-indigo-600 to-violet-600 text-white 
                                  font-display font-bold text-xl mb-6 shadow-xl shadow-indigo-500/25">
                    {step.step}
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== BENEFITS SECTION ========== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-indigo-600 text-sm font-semibold uppercase tracking-wide mb-3">
                Why Students Love Us
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Everything You Need to{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Succeed
                </span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                SabiPrep is designed by students, for students. We understand what it takes to 
                excel in Nigerian exams and have built every feature to help you get there.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 
                             text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 
                             rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="group p-5 bg-white border border-slate-200 rounded-xl 
                               hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 
                                    group-hover:bg-indigo-100 transition-colors">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS SECTION ========== */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-indigo-600 text-sm font-semibold uppercase tracking-wide mb-3">
              Student Success Stories
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Real Results from Real Students
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Hear from students who transformed their exam preparation with SabiPrep.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="relative bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 
                           hover:shadow-xl transition-all duration-300"
              >
                {/* Quote decoration */}
                <div className="absolute top-6 right-6 text-4xl text-indigo-100 font-serif">"</div>
                
                <div className="relative">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  
                  <p className="text-slate-700 leading-relaxed mb-6">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 
                                      flex items-center justify-center text-white font-bold shadow-lg">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{testimonial.name}</div>
                        <div className="text-sm text-slate-500">{testimonial.role}</div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                      {testimonial.score}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA SECTION ========== */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur 
                          text-white/90 rounded-full text-sm font-medium mb-6 border border-white/20">
            <Sparkles className="w-4 h-4" />
            <span>Start your success journey today</span>
          </div>
          
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Ace Your Exams?
          </h2>
          
          <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of Nigerian students who are already using SabiPrep to prepare for 
            WAEC, JAMB, NECO, and GCE. Your success story starts here.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 
                         text-base font-semibold text-indigo-700 bg-white rounded-full 
                         shadow-xl shadow-black/20 hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <Play className="w-5 h-5" />
              Create Free Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white/90 
                         border border-white/30 hover:bg-white/10 rounded-full transition-all duration-300"
            >
              Already have an account?
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-8 border-t border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>100% Free to start</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 sm:py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold text-xl text-white">SabiPrep</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
                The smart way to prepare for Nigerian exams. Practice with past questions, 
                track your progress, and build confidence for exam day.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-sm">Trusted by</span>
                <span className="font-semibold text-white">10,000+ Students</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2">
                {['Practice Mode', 'Test Mode', 'Timed Mode', 'Progress Tracking'].map((item) => (
                  <li key={item}>
                    <Link href="/signup" className="text-slate-400 hover:text-white text-sm transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Exams */}
            <div>
              <h4 className="font-semibold text-white mb-4">Exams</h4>
              <ul className="space-y-2">
                {['WAEC Questions', 'JAMB Questions', 'NECO Questions', 'GCE Questions'].map((item) => (
                  <li key={item}>
                    <Link href="/signup" className="text-slate-400 hover:text-white text-sm transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} SabiPrep. All rights reserved.
            </p>
            <p className="text-sm text-slate-500">
              Built with 💜 for Nigerian students
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
