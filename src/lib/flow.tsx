'use client';
import React, { createContext, useContext, useMemo } from 'react';

export type FlowStep = { label: string; href?: string; current?: boolean; done?: boolean };

const FlowContext = createContext<{ steps: FlowStep[] }>({ steps: [] });

export function FlowProvider({ steps, children }: { steps: FlowStep[]; children: React.ReactNode }) {
  const value = useMemo(() => ({ steps }), [steps]);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  return useContext(FlowContext);
}
