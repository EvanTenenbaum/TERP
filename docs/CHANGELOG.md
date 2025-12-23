# TERP Changelog

All notable changes to the TERP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2025-12-23] - UI QA Fixes

### Fixed

- **CalendarPage Dark Mode**: Replaced hardcoded Tailwind colors with design system tokens for proper dark mode support
- **Login Component Migration**: Migrated from raw HTML inputs to shadcn/ui components with dark mode support and loading states
- **Mobile Layout Flash**: Fixed useMobile hook initial undefined state causing layout shifts during hydration
- **ClientProfile Tab Overflow**: Added horizontal scroll for tabs on mobile with clean scrollbar-hide utility
- **Mobile Responsiveness**: Improved responsive design patterns across Calendar and Login pages

### Added

- **scrollbar-hide CSS utility**: Cross-browser utility for hiding scrollbars while maintaining scroll functionality
- **Comprehensive JSDoc**: Added documentation to useMobile hook
- **Accessibility improvements**: Added ARIA labels and proper semantic markup
- **Loading states**: Added spinner animations for better UX

### Technical

- **Design System Compliance**: All UI components now use semantic design tokens
- **Component Consistency**: Login page now follows established shadcn/ui patterns
- **Performance**: Eliminated layout flash and improved mobile rendering
- **Cross-browser Support**: scrollbar-hide utility works across IE/Edge, Firefox, and Webkit browsers

### Documentation

- Added `docs/UI_QA_AUDIT_REPORT.md` - Comprehensive audit findings and fixes
- Added `docs/TECHNICAL_IMPLEMENTATION_DETAILS.md` - Detailed technical implementation
- Updated `docs/TECHNICAL_DEBT.md` - Marked UI issues as resolved

**Commit**: `9bbdcda5` - "fix(ui): QA fixes for dark mode, mobile responsiveness, and component migration"

---

## Previous Releases

_This changelog was created on 2025-12-23. Previous changes are documented in git history._
