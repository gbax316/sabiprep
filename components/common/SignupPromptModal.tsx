'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Trophy,
  BarChart3,
  Zap,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export interface SignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp?: () => void;
  questionCount: number;
}

export function SignupPromptModal({
  isOpen,
  onClose,
  onSignUp,
  questionCount,
}: SignupPromptModalProps) {
  const router = useRouter();

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    }
    // Get current path for return URL
    const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/home';
    router.push(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const benefits = [
    {
      icon: Zap,
      text: 'Unlimited questions and practice',
    },
    {
      icon: BarChart3,
      text: 'Track your progress and analytics',
    },
    {
      icon: Trophy,
      text: 'Earn achievements and maintain streaks',
    },
    {
      icon: Sparkles,
      text: 'Access all subjects and exam boards',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={true}
      closeOnOverlayClick={false}
      closeOnEscape={true}
      title=""
      footer={
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            variant="primary"
            onClick={handleSignUp}
            className="w-full sm:flex-1 group"
          >
            <span className="flex items-center justify-center gap-2">
              Sign Up for Full Access
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Button>
        </div>
      }
    >
      <div className="text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          You've Answered {questionCount} Questions!
        </h2>

        <p className="text-lg text-gray-600 dark:text-slate-300 mb-8">
          Sign up for <strong>unlimited access</strong> to all questions, progress tracking, and premium features.
        </p>

        {/* Benefits */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-4">
            What You'll Get:
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 text-left">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-700 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300">
                    {benefit.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>100% Free</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>No credit card</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
