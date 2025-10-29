/**
 * Data Card Value Formatters
 * Utilities for formatting metric values for display
 */

export function formatValue(
  value: number | string,
  format: 'currency' | 'number' | 'percentage' | 'count'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return String(value);
  }
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue);
    
    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue);
    
    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(numValue / 100);
    
    case 'count':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    
    default:
      return String(value);
  }
}

export function formatTrend(trend: { direction: 'up' | 'down' | 'flat'; percentage: number }): string {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : '';
  return `${arrow} ${sign}${Math.abs(trend.percentage).toFixed(1)}%`;
}
