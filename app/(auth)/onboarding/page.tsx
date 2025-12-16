'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Target,
  Clock,
  BarChart3,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

const slides = [
  {
    id: 1,
    icon: GraduationCap,
    title: 'Welcome to SabiPrep',
    subtitle: 'Your Path to Exam Success',
    description: 'Master WAEC, JAMB, and NECO exams with thousands of practice questions and smart learning tools.',
    color: 'from-primary-500 to-purple-600',
    bgColor: 'bg-primary-50',
  },
  {
    id: 2,
    icon: BookOpen,
    title: 'Three Learning Modes',
    subtitle: 'Learn Your Way',
    description: 'Practice Mode for learning with hints, Test Mode for exam simulation, and Timed Mode for speed training.',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    features: [
      { icon: BookOpen, label: 'Practice', desc: 'With hints' },
      { icon: Target, label: 'Test', desc: 'Exam simulation' },
      { icon: Clock, label: 'Timed', desc: 'Beat the clock' },
    ],
  },
  {
    id: 3,
    icon: BarChart3,
    title: 'Track Your Progress',
    subtitle: 'See Your Growth',
    description: 'Detailed analytics show your strengths and weaknesses. Focus on what matters most.',
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 4,
    icon: Trophy,
    title: 'Earn Achievements',
    subtitle: 'Stay Motivated',
    description: 'Build streaks, unlock badges, and compete with friends. Learning has never been this fun!',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      // Complete onboarding
      localStorage.setItem('onboarding_complete', 'true');
      router.push('/signup');
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_complete', 'true');
    router.push('/login');
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className={`min-h-screen ${slide.bgColor} transition-colors duration-500`}>
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col min-h-screen">
        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Icon */}
          <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center mb-8 shadow-2xl animate-scale-in`}>
            <Icon className="w-16 h-16 text-white" />
          </div>

          {/* Text content */}
          <div className="text-center max-w-md animate-enter">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {slide.subtitle}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {slide.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Features grid (for slide 2) */}
          {slide.features && (
            <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-sm animate-enter stagger-2">
              {slide.features.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div key={idx} className="bg-white rounded-2xl p-4 text-center shadow-soft">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                      <FeatureIcon className="w-6 h-6 text-slate-700" />
                    </div>
                    <p className="font-semibold text-sm text-slate-900">{feature.label}</p>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div className="px-6 pb-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide 
                    ? 'w-8 bg-slate-900' 
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-4">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-soft hover:shadow-md transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-slate-700" />
              </button>
            )}
            
            <button
              onClick={handleNext}
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-semibold text-white bg-gradient-to-r ${slide.color} shadow-lg hover:shadow-xl transition-all`}
            >
              {isLastSlide ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Get Started
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Login link */}
          <p className="text-center mt-6 text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
