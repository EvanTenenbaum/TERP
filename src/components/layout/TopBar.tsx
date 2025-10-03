'use client';
import React from 'react';
import Link from 'next/link';

export const TopBar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--c-border)] bg-[var(--c-paper)]/95 backdrop-blur shadow-sm">
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center space-x-2 mr-8">
          <span className="font-bold text-lg">ERPv3</span>
        </Link>
        
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="/quotes" className="text-[var(--c-mid)] hover:text-[var(--c-ink)] transition-colors">
            Sales
          </Link>
          <Link href="/inventory/cycle-count" className="text-[var(--c-mid)] hover:text-[var(--c-ink)] transition-colors">
            Inventory
          </Link>
          <Link href="/finance/dashboard" className="text-[var(--c-mid)] hover:text-[var(--c-ink)] transition-colors">
            Finance
          </Link>
          <Link href="/analytics/dashboards" className="text-[var(--c-mid)] hover:text-[var(--c-ink)] transition-colors">
            Analytics
          </Link>
          <Link href="/admin/imports" className="text-[var(--c-mid)] hover:text-[var(--c-ink)] transition-colors">
            Admin
          </Link>
        </nav>
        
        <div className="ml-auto flex items-center space-x-4">
          <button className="text-[var(--c-mid)] hover:text-[var(--c-ink)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
