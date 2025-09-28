'use client';
import React from 'react';
import Link from 'next/link';
import { useFlow } from '@/lib/flow';

export default function FlowStepper() {
  const { steps } = useFlow();
  if (!steps || steps.length === 0) return null;

  return (
    <nav aria-label="Workflow" className="w-full border-b bg-white">
      <ol className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm">
        {steps.map((s, i) => {
          const node = s.href ? (
            <Link href={s.href} className={s.current ? 'font-semibold text-gray-900' : 'text-gray-700 hover:underline'}>
              {s.label}
            </Link>
          ) : (
            <span className={s.current ? 'font-semibold text-gray-900' : 'text-gray-700'}>{s.label}</span>
          );
          return (
            <li key={s.label} className="flex items-center gap-2">
              {node}
              {i < steps.length - 1 ? <span className="text-gray-400">→</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
