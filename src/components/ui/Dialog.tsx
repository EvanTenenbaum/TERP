'use client';
import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, children, actions }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!open) return;
    
    // Focus the dialog when it opens
    dialogRef.current?.focus();
    
    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-[var(--c-panel)] border border-[var(--c-border)] rounded-lg shadow-modal max-w-md w-full mx-4 p-6 focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="text-xl font-semibold mb-4">
          {title}
        </h2>
        
        <div className="mb-6 text-[var(--c-mid)]">
          {children}
        </div>
        
        <div className="flex justify-end gap-3">
          {actions || (
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
