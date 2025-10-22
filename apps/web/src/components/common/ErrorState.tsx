import React from 'react';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = 'Something went wrong', 
  message, 
  retry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-[var(--c-error)]">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--c-ink)] mb-2">{title}</h3>
      <p className="text-[var(--c-mid)] mb-6 max-w-sm">{message}</p>
      {retry && (
        <Button onClick={retry} variant="default">
          Try Again
        </Button>
      )}
    </div>
  );
};
