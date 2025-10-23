import React from 'react';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-[var(--c-mid)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--c-ink)] mb-2">{title}</h3>
      <p className="text-[var(--c-mid)] mb-6 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
};
