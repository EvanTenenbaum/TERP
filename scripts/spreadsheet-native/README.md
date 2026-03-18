# Spreadsheet-Native Scripts

This directory contains execution helpers for the spreadsheet-native TERP fork.

Current scripts:

- `detect-staging-sheet-surfaces.ts`
  - logs into the staging app with seeded QA personas
  - requests the Orders and Inventory workbook routes with `surface=sheet-native`
  - records whether staging currently serves the sheet-native pilot or falls back to the classic workbook surface
  - writes screenshots and a JSON report under `output/playwright/staging-oracle/`
- `prove-orders-runtime-g2.ts`
  - logs into staging as the sales-manager QA persona
  - validates the Orders queue route on the current build for route health and AG Grid license state
  - captures live Orders document proof for duplicate, quick-add, delete, Tab, Shift+Tab, Enter, Shift+Enter, and Escape behavior
  - writes screenshots and a JSON report under `output/playwright/orders-runtime-g2/`
