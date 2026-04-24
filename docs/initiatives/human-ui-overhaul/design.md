# Human UI Overhaul Design

## Design Intent

Evolve TERP toward a calmer, more legible, more obviously human-operated interface while keeping its spreadsheet-native power. The product should feel like a serious operations system with strong table ergonomics, not a grab bag of components.

## Principles

1. Hierarchy first: make primary information and actions visually obvious.
2. Spreadsheet-native, not spreadsheet-hostile: dense tables stay, but chrome and noise drop.
3. Progressive disclosure: advanced controls remain available without dominating default views.
4. Single-purpose surfaces: each page should answer one clear user question.
5. Consistent action framing: headers, toolbars, row actions, badges, filters, and drawers should behave predictably.
6. Natural evolution: use TERP's current design language where possible, tighten and standardize it rather than bolt on a new visual universe.

## Workstreams

- Shell and page framing
- Table ergonomics and toolbar simplification
- Forms and detail drawers
- Status, badge, and alert language
- Navigation and command access
- Notifications and inbox attention model
- CRM and profile composition
- Accounting list and detail clarity
- Dashboard information architecture

## Method

1. Capture baseline screenshots and map journeys
2. Benchmark comparable functional UIs
3. Convert gaps into roadmap and implementation packets
4. Implement on dedicated branch
5. QA with screenshot review, flow testing, and comparative critique
6. Iterate until benchmark parity is credible

## Tools

- Remote Mac Mini browser for real app captures and QA
- Git branch workflow for isolated implementation
- TERP local tests and build where relevant
- Vision-based screenshot comparison for harsh critique
- External benchmark screenshot collection and manual pattern synthesis

## Constraints

- Preserve functionality
- Avoid cosmetic-only changes that fail actual usability
- Avoid over-light, over-rounded, consumer-app styling that fights ERP usage
