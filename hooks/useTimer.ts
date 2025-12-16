'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseTimerOptions {
  initialTime: number; // in seconds
  autoStart?: boolean;
  onTimeUp?: () => void;
  onTick?: (timeRemaining: number) => void;
  countDown?: boolean;
}

export interface UseTimerReturn {
  time: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (newTime?: number) => void;
  stop: () => void;
  formattedTime: string;
  progress: number; // 0-100 for countdown
}

/**
 * Custom hook for managing a timer (countdown or count-up)
 */
export function useTimer({
  initialTime,
  autoStart = false,
  onTimeUp,
  onTick,
  countDown = true,
}: UseTimerOptions): UseTimerReturn {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimeRef = useRef(initialTime);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => {
          const newTime = countDown ? prevTime - 1 : prevTime + 1;
          
          // Call onTick callback
          onTick?.(newTime);

          // Check if countdown reached zero
          if (countDown && newTime <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            setIsRunning(false);
            onTimeUp?.();
            return 0;
          }

          return newTime;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, countDown, onTimeUp, onTick]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback((newTime?: number) => {
    const resetTime = newTime ?? initialTimeRef.current;
    setTime(resetTime);
    setIsRunning(false);
    setIsPaused(false);
    if (newTime !== undefined) {
      initialTimeRef.current = newTime;
    }
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Format time as MM:SS or HH:MM:SS
  const formattedTime = formatTime(time);

  // Calculate progress for countdown (0-100)
  const progress = countDown
    ? Math.max(0, Math.min(100, (time / initialTimeRef.current) * 100))
    : 0;

  return {
    time,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
    stop,
    formattedTime,
    progress,
  };
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Custom hook for a simple countdown timer
 */
export function useCountdown(
  seconds: number,
  onComplete?: () => void
): UseTimerReturn {
  return useTimer({
    initialTime: seconds,
    countDown: true,
    onTimeUp: onComplete,
  });
}

/**
 * Custom hook for a stopwatch (count-up timer)
 */
export function useStopwatch(): UseTimerReturn {
  return useTimer({
    initialTime: 0,
    countDown: false,
  });
}

export default useTimer;
