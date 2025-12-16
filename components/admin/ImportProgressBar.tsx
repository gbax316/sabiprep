'use client';

import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type ImportStage = 'validating' | 'processing' | 'complete' | 'error';

interface ImportProgressBarProps {
  stage: ImportStage;
  progress?: number; // 0-100
  message?: string;
  className?: string;
}

export function ImportProgressBar({
  stage,
  progress = 0,
  message,
  className = ''
}: ImportProgressBarProps) {
  const stages = [
    { key: 'validating', label: 'Validating' },
    { key: 'processing', label: 'Processing' },
    { key: 'complete', label: 'Complete' }
  ];

  const getCurrentStageIndex = () => {
    if (stage === 'error') return -1;
    return stages.findIndex(s => s.key === stage);
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number): 'complete' | 'active' | 'pending' | 'error' => {
    if (stage === 'error') return 'error';
    if (index < currentStageIndex) return 'complete';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stage indicators */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {stages.map((stg, index) => {
            const status = getStageStatus(index);
            const isLast = index === stages.length - 1;

            return (
              <div key={stg.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  {/* Icon */}
                  <div className={`
                    relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${status === 'complete' ? 'bg-green-500 border-green-500' : ''}
                    ${status === 'active' ? 'bg-blue-500 border-blue-500' : ''}
                    ${status === 'pending' ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : ''}
                    ${status === 'error' ? 'bg-red-500 border-red-500' : ''}
                  `}>
                    {status === 'complete' && (
                      <CheckCircle className="w-6 h-6 text-white" />
                    )}
                    {status === 'active' && (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    )}
                    {status === 'pending' && (
                      <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
                    )}
                    {status === 'error' && (
                      <AlertCircle className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`
                    mt-2 text-sm font-medium
                    ${status === 'complete' ? 'text-green-600 dark:text-green-400' : ''}
                    ${status === 'active' ? 'text-blue-600 dark:text-blue-400' : ''}
                    ${status === 'pending' ? 'text-gray-500 dark:text-gray-400' : ''}
                    ${status === 'error' ? 'text-red-600 dark:text-red-400' : ''}
                  `}>
                    {stg.label}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className={`
                    flex-1 h-0.5 mx-4 -mt-10
                    ${index < currentStageIndex ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                    ${status === 'error' ? 'bg-red-500' : ''}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar (shown during processing) */}
      {stage === 'processing' && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{message || 'Processing...'}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* Status message */}
      {stage === 'validating' && message && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {message}
        </div>
      )}

      {stage === 'complete' && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{message || 'Import completed successfully'}</span>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">{message || 'Import failed'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
