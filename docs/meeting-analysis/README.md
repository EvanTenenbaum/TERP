# TERP Customer Meeting Analysis Archive

This directory contains structured analysis outputs from customer feedback meetings.

## Meeting Index

| Date | Duration | Participants | Items Extracted | Key Focus Areas |
|------|----------|--------------|-----------------|-----------------|
| [2026-01-29](./2026-01-29/) | 18:07 | Developer (Evan), Customer | 32 | Dashboard, Inventory, Leaderboard, AR/AP |

## Directory Structure

Each meeting folder contains:

- `TERP_Customer_Meeting_Analysis.md` - Comprehensive analysis report with all extracted items
- `TERP_Annotated_Transcript.md` - Full transcript with visual context annotations
- `meeting_artifacts.json` - Structured JSON data for programmatic access
- `full_transcript.txt` - Raw transcript text

## Usage

The JSON artifacts file can be used to:
- Import items into project management tools
- Generate GitHub issues automatically
- Track feature request fulfillment
- Analyze customer feedback trends over time

## Item Categories

Items are categorized as:
- **Feature Request** - New functionality requested by customer
- **Business Rule** - Operational constraints or workflows to support
- **Bug/Broken Flow** - Issues requiring immediate attention
- **UI/UX Feedback** - Interface improvements suggested
- **Decision Made** - Confirmed prioritization or direction
- **Terminology Change** - Nomenclature clarifications
- **Constraint** - Limitations to respect in design

## Priority Levels

- **Now** - Required for MVP or blocking other work
- **Next** - Important but not blocking
- **Later** - Deferred to future versions
