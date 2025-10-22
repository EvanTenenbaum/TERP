'use client';
import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  const modules = [
    {
      title: 'Sales & Quotes',
      description: 'Manage quotes, convert to orders, and track sales pipeline',
      href: '/quotes',
      icon: '📋',
      color: 'blue',
    },
    {
      title: 'Inventory',
      description: 'Cycle counts, adjustments, transfers, and stock management',
      href: '/inventory/cycle-count',
      icon: '📦',
      color: 'green',
    },
    {
      title: 'Finance',
      description: 'AP/AR aging, payments, invoicing, and financial reports',
      href: '/finance/dashboard',
      icon: '💰',
      color: 'purple',
    },
    {
      title: 'Analytics',
      description: 'Dashboards, reports, and business intelligence',
      href: '/analytics/dashboards',
      icon: '📊',
      color: 'orange',
    },
    {
      title: 'Admin',
      description: 'Imports, cron jobs, and system administration',
      href: '/admin/imports',
      icon: '⚙️',
      color: 'gray',
    },
    {
      title: 'Visual Mode',
      description: 'Mobile-optimized swipeable card interface',
      href: '/visual-mode',
      icon: '📱',
      color: 'teal',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-c-ink mb-3">Welcome to ERPv3</h1>
          <p className="text-lg text-c-mid">
            Production-ready enterprise resource planning system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link key={module.href} href={module.href} className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02]">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{module.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-c-ink mb-2 group-hover:text-brand transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-c-mid leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-16 p-8 bg-[var(--c-paper)] rounded-lg border border-[var(--c-border)]">
          <h2 className="text-2xl font-bold text-c-ink mb-4">Quick Start</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl mb-2">1️⃣</div>
              <h3 className="font-semibold mb-1">Create a Quote</h3>
              <p className="text-sm text-c-mid">Start by creating your first sales quote</p>
            </div>
            <div>
              <div className="text-2xl mb-2">2️⃣</div>
              <h3 className="font-semibold mb-1">Manage Inventory</h3>
              <p className="text-sm text-c-mid">Track stock levels and cycle counts</p>
            </div>
            <div>
              <div className="text-2xl mb-2">3️⃣</div>
              <h3 className="font-semibold mb-1">View Reports</h3>
              <p className="text-sm text-c-mid">Access financial reports and analytics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
