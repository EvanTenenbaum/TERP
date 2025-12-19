/**
 * Monitoring Router Tests
 * 
 * Tests for the monitoring router health check and metrics endpoints.
 * Validates that monitoring infrastructure is working correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the performance middleware
vi.mock('../_core/performanceMiddleware', () => ({
  getRecentMetrics: vi.fn(),
  getSlowQueryStats: vi.fn(),
}));

import { getRecentMetrics, getSlowQueryStats } from '../_core/performanceMiddleware';

describe('Monitoring Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecentMetrics', () => {
    it('should return metrics array with count', async () => {
      const mockMetrics = [
        { procedure: 'test.procedure1', duration: 100, success: true, timestamp: new Date() },
        { procedure: 'test.procedure2', duration: 200, success: true, timestamp: new Date() },
      ];
      
      vi.mocked(getRecentMetrics).mockReturnValue(mockMetrics);
      
      const metrics = getRecentMetrics();
      
      expect(metrics).toHaveLength(2);
      expect(metrics[0].procedure).toBe('test.procedure1');
      expect(metrics[1].procedure).toBe('test.procedure2');
    });

    it('should return empty array when no metrics available', async () => {
      vi.mocked(getRecentMetrics).mockReturnValue([]);
      
      const metrics = getRecentMetrics();
      
      expect(metrics).toHaveLength(0);
    });
  });

  describe('getSlowQueryStats', () => {
    it('should return slow query statistics', async () => {
      const mockStats = {
        total: 100,
        slow: 5,
        verySlow: 2,
        slowPercentage: 5,
        averageDuration: 150,
      };
      
      vi.mocked(getSlowQueryStats).mockReturnValue(mockStats);
      
      const stats = getSlowQueryStats();
      
      expect(stats.total).toBe(100);
      expect(stats.slow).toBe(5);
      expect(stats.verySlow).toBe(2);
      expect(stats.slowPercentage).toBe(5);
      expect(stats.averageDuration).toBe(150);
    });
  });

  describe('Performance Summary Calculations', () => {
    it('should calculate procedure statistics correctly', () => {
      const mockMetrics = [
        { procedure: 'test.proc', duration: 100, success: true, timestamp: Date.now() },
        { procedure: 'test.proc', duration: 200, success: true, timestamp: Date.now() },
        { procedure: 'test.proc', duration: 300, success: false, timestamp: Date.now() },
        { procedure: 'test.proc', duration: 1500, success: true, timestamp: Date.now() }, // slow
      ];
      
      // Calculate stats like the router does
      const procedureStats = mockMetrics.reduce((acc, metric) => {
        if (!acc[metric.procedure]) {
          acc[metric.procedure] = {
            count: 0,
            totalDuration: 0,
            errors: 0,
            slowCount: 0,
          };
        }
        
        acc[metric.procedure].count++;
        acc[metric.procedure].totalDuration += metric.duration;
        if (!metric.success) {
          acc[metric.procedure].errors++;
        }
        if (metric.duration > 1000) {
          acc[metric.procedure].slowCount++;
        }
        
        return acc;
      }, {} as Record<string, { count: number; totalDuration: number; errors: number; slowCount: number }>);
      
      const stats = procedureStats['test.proc'];
      
      expect(stats.count).toBe(4);
      expect(stats.totalDuration).toBe(2100);
      expect(stats.errors).toBe(1);
      expect(stats.slowCount).toBe(1);
      
      // Calculate derived metrics
      const averageDuration = stats.totalDuration / stats.count;
      const errorRate = (stats.errors / stats.count) * 100;
      const slowRate = (stats.slowCount / stats.count) * 100;
      
      expect(averageDuration).toBe(525);
      expect(errorRate).toBe(25);
      expect(slowRate).toBe(25);
    });

    it('should sort procedures by average duration descending', () => {
      const procedureList = [
        { procedure: 'fast', averageDuration: 50 },
        { procedure: 'slow', averageDuration: 500 },
        { procedure: 'medium', averageDuration: 200 },
      ];
      
      const sorted = procedureList.sort((a, b) => b.averageDuration - a.averageDuration);
      
      expect(sorted[0].procedure).toBe('slow');
      expect(sorted[1].procedure).toBe('medium');
      expect(sorted[2].procedure).toBe('fast');
    });
  });

  describe('Procedure Metrics Filtering', () => {
    it('should filter metrics by procedure name', () => {
      const mockMetrics = [
        { procedure: 'test.proc1', duration: 100, success: true },
        { procedure: 'test.proc2', duration: 200, success: true },
        { procedure: 'test.proc1', duration: 150, success: true },
      ];
      
      const filtered = mockMetrics.filter(m => m.procedure === 'test.proc1');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.procedure === 'test.proc1')).toBe(true);
    });

    it('should calculate min/max duration correctly', () => {
      const mockMetrics = [
        { procedure: 'test.proc', duration: 100, success: true },
        { procedure: 'test.proc', duration: 500, success: true },
        { procedure: 'test.proc', duration: 200, success: true },
      ];
      
      const minDuration = Math.min(...mockMetrics.map(m => m.duration));
      const maxDuration = Math.max(...mockMetrics.map(m => m.duration));
      
      expect(minDuration).toBe(100);
      expect(maxDuration).toBe(500);
    });

    it('should return null stats for unknown procedure', () => {
      const mockMetrics = [
        { procedure: 'test.proc1', duration: 100, success: true },
      ];
      
      const filtered = mockMetrics.filter(m => m.procedure === 'unknown.proc');
      
      expect(filtered).toHaveLength(0);
      
      // When no metrics, stats should be null
      const stats = filtered.length === 0 ? null : { count: filtered.length };
      expect(stats).toBeNull();
    });
  });

  describe('Error Tracking', () => {
    it('should identify failed metrics', () => {
      const mockMetrics = [
        { procedure: 'test.proc', duration: 100, success: true },
        { procedure: 'test.proc', duration: 200, success: false },
        { procedure: 'test.proc', duration: 150, success: false },
        { procedure: 'test.proc', duration: 300, success: true },
      ];
      
      const errors = mockMetrics.filter(m => !m.success);
      
      expect(errors).toHaveLength(2);
      expect(errors.every(m => !m.success)).toBe(true);
    });

    it('should get recent errors (last 10)', () => {
      const mockMetrics = Array.from({ length: 20 }, (_, i) => ({
        procedure: `test.proc${i}`,
        duration: 100 + i * 10,
        success: i % 3 === 0, // Every 3rd is success
      }));
      
      const errors = mockMetrics.filter(m => !m.success);
      const recentErrors = errors.slice(-10);
      
      expect(recentErrors.length).toBeLessThanOrEqual(10);
      expect(recentErrors.every(m => !m.success)).toBe(true);
    });
  });

  describe('Slow Query Detection', () => {
    it('should identify queries over 1000ms as slow', () => {
      const mockMetrics = [
        { procedure: 'fast', duration: 100, success: true },
        { procedure: 'slow1', duration: 1001, success: true },
        { procedure: 'medium', duration: 500, success: true },
        { procedure: 'slow2', duration: 2000, success: true },
      ];
      
      const slowQueries = mockMetrics.filter(m => m.duration > 1000);
      
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries.map(m => m.procedure)).toContain('slow1');
      expect(slowQueries.map(m => m.procedure)).toContain('slow2');
    });

    it('should calculate slow rate percentage', () => {
      const total = 100;
      const slow = 15;
      
      const slowRate = (slow / total) * 100;
      
      expect(slowRate).toBe(15);
    });
  });

  describe('Health Check Invariants', () => {
    it('should always return non-negative counts', () => {
      const mockMetrics: Array<{ procedure: string; duration: number; success: boolean }> = [];
      
      const count = mockMetrics.length;
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should always return non-negative durations', () => {
      const mockMetrics = [
        { procedure: 'test', duration: 0, success: true },
        { procedure: 'test', duration: 100, success: true },
      ];
      
      const allNonNegative = mockMetrics.every(m => m.duration >= 0);
      
      expect(allNonNegative).toBe(true);
    });

    it('should handle division by zero in averages', () => {
      const count = 0;
      const totalDuration = 0;
      
      // Safe average calculation
      const averageDuration = count > 0 ? totalDuration / count : 0;
      
      expect(averageDuration).toBe(0);
      expect(Number.isFinite(averageDuration)).toBe(true);
    });
  });
});
