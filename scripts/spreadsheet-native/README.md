# Spreadsheet-Native Scripts

This directory contains execution helpers for the spreadsheet-native TERP fork.

Current scripts:

- `detect-staging-sheet-surfaces.ts`
  - logs into the staging app with seeded QA personas
  - requests the Orders and Inventory workbook routes with `surface=sheet-native`
  - records whether staging currently serves the sheet-native pilot or falls back to the classic workbook surface
  - writes screenshots and a JSON report under `output/playwright/staging-oracle/`
