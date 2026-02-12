/**
 * Unit tests for data card preferences management
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getPreferences,
  savePreferences,
  getMetricIdsForModule,
  saveMetricIdsForModule,
  resetModulePreferences,
  resetAllPreferences,
  hasCustomPreferences,
} from './preferences';

describe('Data Card Preferences', () => {

  describe('getPreferences', () => {
    it('should return empty object when no preferences exist', () => {
      const prefs = getPreferences();
      expect(prefs).toEqual({});
    });

    it('should return saved preferences', () => {
      global.localStorage.setItem(
        'terp_data_card_preferences',
        JSON.stringify({ inventory: ['metric1', 'metric2'] })
      );
      const prefs = getPreferences();
      expect(prefs).toEqual({ inventory: ['metric1', 'metric2'] });
    });

    it('should handle corrupted JSON gracefully', () => {
      global.localStorage.setItem('terp_data_card_preferences', 'invalid json');
      const prefs = getPreferences();
      expect(prefs).toEqual({});
    });

    it('should handle null values', () => {
      global.localStorage.setItem('terp_data_card_preferences', 'null');
      const prefs = getPreferences();
      expect(prefs).toEqual({});
    });
  });

  describe('savePreferences', () => {
    it('should save preferences to localStorage', () => {
      const prefs = { inventory: ['metric1', 'metric2'] };
      savePreferences(prefs);
      
      const saved = JSON.parse(global.localStorage.getItem('terp_data_card_preferences') || '{}');
      expect(saved).toEqual(prefs);
    });

    it('should overwrite existing preferences', () => {
      savePreferences({ inventory: ['old'] });
      savePreferences({ inventory: ['new'] });
      
      const saved = JSON.parse(global.localStorage.getItem('terp_data_card_preferences') || '{}');
      expect(saved).toEqual({ inventory: ['new'] });
    });

    it('should handle empty preferences', () => {
      savePreferences({});
      
      const saved = JSON.parse(global.localStorage.getItem('terp_data_card_preferences') || '{}');
      expect(saved).toEqual({});
    });
  });

  describe('getMetricIdsForModule', () => {
    it('should return user preferences when they exist', () => {
      global.localStorage.setItem(
        'terp_data_card_preferences',
        JSON.stringify({
          inventory: ['metric1', 'metric2'],
        })
      );
      
      const prefs = getMetricIdsForModule('inventory');
      expect(prefs).toEqual(['metric1', 'metric2']);
    });

    it('should return defaults when no user preferences exist', () => {
      const prefs = getMetricIdsForModule('inventory');
      // Should return defaults from MODULE_CONFIGS
      expect(Array.isArray(prefs)).toBe(true);
      expect(prefs.length).toBeGreaterThan(0);
    });
  });

  describe('saveMetricIdsForModule', () => {
    it('should save preferences for specific module', () => {
      saveMetricIdsForModule('inventory', ['metric1', 'metric2']);
      
      const prefs = getMetricIdsForModule('inventory');
      expect(prefs).toEqual(['metric1', 'metric2']);
    });

    it('should not affect other modules', () => {
      saveMetricIdsForModule('inventory', ['metric1']);
      saveMetricIdsForModule('quotes', ['metric2']);
      
      expect(getMetricIdsForModule('inventory')).toEqual(['metric1']);
      expect(getMetricIdsForModule('quotes')).toEqual(['metric2']);
    });

    it('should overwrite existing module preferences', () => {
      saveMetricIdsForModule('inventory', ['old']);
      saveMetricIdsForModule('inventory', ['new']);
      
      expect(getMetricIdsForModule('inventory')).toEqual(['new']);
    });

    it('should handle empty metric arrays', () => {
      saveMetricIdsForModule('inventory', []);
      
      // Empty array means no preferences, so returns defaults
      const prefs = getMetricIdsForModule('inventory');
      expect(Array.isArray(prefs)).toBe(true);
      // Empty array is saved but getMetricIdsForModule returns defaults when empty
      expect(prefs.length).toBeGreaterThan(0);
    });
  });

  describe('resetModulePreferences', () => {
    it('should remove preferences for specific module', () => {
      saveMetricIdsForModule('inventory', ['metric1']);
      saveMetricIdsForModule('quotes', ['metric2']);
      
      resetModulePreferences('inventory');
      
      // Should return defaults after reset
      const inventoryPrefs = getMetricIdsForModule('inventory');
      expect(Array.isArray(inventoryPrefs)).toBe(true);
      expect(inventoryPrefs.length).toBeGreaterThan(0);
      
      // Quotes should still have custom preferences
      expect(getMetricIdsForModule('quotes')).toEqual(['metric2']);
    });

    it('should handle resetting non-existent module', () => {
      resetModulePreferences('inventory');
      
      // Should return defaults
      const prefs = getMetricIdsForModule('inventory');
      expect(Array.isArray(prefs)).toBe(true);
    });
  });

  describe('resetAllPreferences', () => {
    it('should remove all preferences', () => {
      saveMetricIdsForModule('inventory', ['metric1']);
      saveMetricIdsForModule('quotes', ['metric2']);
      saveMetricIdsForModule('orders', ['metric3']);
      
      resetAllPreferences();
      
      // All should return defaults
      expect(Array.isArray(getMetricIdsForModule('inventory'))).toBe(true);
      expect(Array.isArray(getMetricIdsForModule('quotes'))).toBe(true);
      expect(Array.isArray(getMetricIdsForModule('orders'))).toBe(true);
    });

    it('should handle clearing when no preferences exist', () => {
      resetAllPreferences();
      expect(getPreferences()).toEqual({});
    });
  });

  describe('hasCustomPreferences', () => {
    it('should return true when module has custom preferences', () => {
      saveMetricIdsForModule('inventory', ['metric1']);
      expect(hasCustomPreferences('inventory')).toBe(true);
    });

    it('should return false when module has no custom preferences', () => {
      expect(hasCustomPreferences('inventory')).toBe(false);
    });

    it('should return false after reset', () => {
      saveMetricIdsForModule('inventory', ['metric1']);
      resetModulePreferences('inventory');
      expect(hasCustomPreferences('inventory')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very long metric arrays', () => {
      const longArray = Array.from({ length: 100 }, (_, i) => `metric${i}`);
      saveMetricIdsForModule('inventory', longArray);
      
      expect(getMetricIdsForModule('inventory')).toEqual(longArray);
    });

    it('should handle special characters in metric IDs', () => {
      const metrics = ['metric-1', 'metric_2', 'metric.3', 'metric:4'];
      saveMetricIdsForModule('inventory', metrics);
      
      expect(getMetricIdsForModule('inventory')).toEqual(metrics);
    });

    it('should handle multiple modules simultaneously', () => {
      const modules = ['inventory', 'quotes', 'orders', 'accounting', 'vendor_supply', 'clients'];
      
      modules.forEach((module, i) => {
        saveMetricIdsForModule(module, [`metric${i}`]);
      });
      
      modules.forEach((module, i) => {
        expect(getMetricIdsForModule(module)).toEqual([`metric${i}`]);
      });
    });

    it('should handle rapid successive saves', () => {
      for (let i = 0; i < 10; i++) {
        saveMetricIdsForModule('inventory', [`metric${i}`]);
      }
      
      expect(getMetricIdsForModule('inventory')).toEqual(['metric9']);
    });
  });

  describe('localStorage errors', () => {
    it('should handle localStorage quota exceeded', () => {
      const originalSetItem = global.localStorage.setItem;
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Should not throw
      expect(() => saveMetricIdsForModule('inventory', ['metric1'])).not.toThrow();
      
      global.localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage not available', () => {
      const originalGetItem = global.localStorage.getItem;
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('SecurityError');
      });
      
      // Should return empty/defaults gracefully
      expect(getPreferences()).toEqual({});
      
      global.localStorage.getItem = originalGetItem;
    });
  });
});
