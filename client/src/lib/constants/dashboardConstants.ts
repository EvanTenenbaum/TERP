// Dashboard V3 Constants

export const DASHBOARD_CONSTANTS = {
  // Widget Sizes
  WIDGET_SIZES: {
    sm: { cols: 4, minHeight: 200 },
    md: { cols: 6, minHeight: 300 },
    lg: { cols: 8, minHeight: 400 },
    xl: { cols: 12, minHeight: 500 },
  },

  // Animation Timings
  ANIMATION: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Spacing
  SPACING: {
    widgetGap: {
      mobile: 12,
      tablet: 16,
      desktop: 24,
    },
    padding: {
      sm: 12,
      md: 16,
      lg: 24,
    },
  },

  // Grid Configuration
  GRID: {
    columns: {
      mobile: 1,
      tablet: 8,
      desktop: 12,
    },
  },

  // Breakpoints (matches Tailwind)
  BREAKPOINTS: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
  },

  // Refresh Intervals (in milliseconds)
  REFRESH_INTERVALS: {
    fast: 60000, // 1 minute
    medium: 300000, // 5 minutes
    slow: 3600000, // 1 hour
  },
};

export default DASHBOARD_CONSTANTS;
