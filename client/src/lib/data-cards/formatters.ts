/**
 * Data Card Value Formatters
 * Utilities for formatting metric values for display
 */

export function formatValue(
  value: number | string,
  format: 'currency' | 'number' | 'percentage' | 'count'
): string {
  // Convert to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle invalid values
  if (numValue === null || numValue === undefined || isNaN(numValue) || !isFinite(numValue)) {
    // Return default zero value for the format
    switch (format) {
      case 'currency':
        return '$0.00';
      case 'number':
        return '0';
      case 'percentage':
        return '0.00%';
      case 'count':
        return '0';
      default:
        return '0';
    }
  }
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);
    
    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue);
    
    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue) + '%';
    
    case 'count':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(numValue));
    
    default:
      return String(value);
  }
}

export function formatTrend(trend: { direction: 'up' | 'down' | 'flat'; percentage: number }): string {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : '';
  return `${arrow} ${sign}${Math.abs(trend.percentage).toFixed(1)}%`;
}
