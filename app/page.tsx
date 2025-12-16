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
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Practice Mode',
    description: 'Learn at your own pace with hints and explanations',
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
  },
  {
    icon: Target,
    title: 'Test Mode',
    description: 'Simulate real exam conditions without hints',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
  },
  {
    icon: Clock,
    title: 'Timed Mode',
    description: 'Race against the clock to build speed',
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
  },
];

const stats = [
  { value: '10,000+', label: 'Questions' },
  { value: '15+', label: 'Subjects' },
  { value: 'WAEC', label: 'JAMB • NECO' },
];

const examBoards = ['WAEC', 'JAMB', 'NECO', 'GCE'];

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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, show landing page
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="container-app">
          <nav className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary-500/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-slate-900">
                SabiPrep
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm font-medium text-white gradient-primary rounded-xl 
                           hover:shadow-lg hover:shadow-primary-500/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        
        <div className="container-app relative">
          <div className="py-20 lg:py-28 text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 
                            rounded-full text-sm font-medium mb-6 animate-enter">
              <Sparkles className="w-4 h-4" />
              <span>Smart exam preparation for Nigerian students</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 
                           tracking-tight mb-6 animate-enter stagger-1">
              Master Your{' '}
              <span className="text-gradient">WAEC, JAMB & NECO</span>
              {' '}Exams
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto animate-enter stagger-2">
              Practice with thousands of past questions, track your progress, and build confidence 
              for exam day with our intelligent learning platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-enter stagger-3">
              <Link
                href="/signup"
                className="group flex items-center gap-2 px-8 py-4 text-base font-semibold text-white 
                           gradient-primary rounded-xl shadow-lg shadow-primary-500/25 
                           hover:shadow-xl hover:shadow-primary-500/30 transition-all"
              >
                Start Learning Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 
                           bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Explore Features
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-slate-200/60 animate-enter stagger-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Three Powerful Learning Modes
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Whether you&apos;re just starting out or preparing for the big day, we have 
              the right mode for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl p-8 shadow-soft hover:shadow-lg 
                             transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 ${feature.lightColor} rounded-xl 
                                  flex items-center justify-center mb-6 
                                  group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${feature.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 
                                 hover:text-primary-700 group/link"
                    >
                      Try it free
                      <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container-app">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Everything you need to{' '}
                <span className="text-gradient">ace your exams</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                SabiPrep gives you the tools to study smarter, not harder. Track your progress, 
                identify weak areas, and focus your efforts where they matter most.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: CheckCircle, text: 'Detailed explanations for every question' },
                  { icon: BarChart3, text: 'Real-time progress tracking and analytics' },
                  { icon: Zap, text: 'Quick daily challenges to stay sharp' },
                  { icon: Trophy, text: 'Earn achievements and maintain streaks' },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary-600" />
                      </div>
                      <span className="text-slate-700">{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="relative">
              <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-primary-100 to-accent-100 
                              rounded-3xl flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-8">
                  {examBoards.map((board, index) => (
                    <div
                      key={board}
                      className="bg-white rounded-xl p-6 shadow-soft text-center animate-enter"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <p className="font-display font-bold text-2xl text-slate-900">{board}</p>
                      <p className="text-sm text-slate-500 mt-1">Past Questions</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary">
        <div className="container-app text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to start preparing?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Join thousands of students who are already using SabiPrep to prepare for their exams.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-2 px-8 py-4 text-base font-semibold 
                         text-primary-700 bg-white rounded-xl shadow-lg 
                         hover:shadow-xl transition-all"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-base font-semibold text-white/90 
                         hover:text-white transition-colors"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900">
        <div className="container-app">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-white">SabiPrep</span>
            </div>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} SabiPrep. Built for Nigerian students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
