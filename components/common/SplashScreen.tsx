'use client';

import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, minDuration / 50);

    // Trigger fade out and complete
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, minDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [minDuration, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated rings */}
        <div className="relative">
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 w-28 h-28 rounded-full border-2 border-white/30 animate-pulse" />
          
          {/* Logo */}
          <div className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-scale-in shadow-2xl">
            <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <GraduationCap className="w-14 h-14 text-primary-600 animate-bounce-subtle" />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <h1 className="mt-8 font-display text-4xl font-extrabold text-white tracking-tight animate-enter stagger-1">
          SabiPrep
        </h1>
        
        {/* Tagline */}
        <p className="mt-2 text-white/80 text-lg font-medium animate-enter stagger-2">
          Master Your Exams
        </p>

        {/* Progress bar */}
        <div className="mt-8 w-48 h-1.5 bg-white/20 rounded-full overflow-hidden animate-enter stagger-3">
          <div 
            className="h-full bg-white rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading text */}
        <p className="mt-4 text-white/60 text-sm animate-enter stagger-4">
          {progress < 30 ? 'Loading...' : progress < 60 ? 'Preparing your dashboard...' : progress < 90 ? 'Almost ready...' : 'Welcome!'}
        </p>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-center animate-enter stagger-5">
        <p className="text-white/40 text-xs">
          Built for Nigerian Students 🇳🇬
        </p>
      </div>
    </div>
  );
}

export default SplashScreen;
