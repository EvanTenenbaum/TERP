# Deprecation Notice and Architecture Update

**Date:** December 23, 2025

This document clarifies the current system architecture following the implementation of the Unified Sales Portal (USP) and formally deprecates components from the original "Live Shopping" design specification.

## New Architecture

The definitive architecture for the sales system is now documented in the **[Unified Sales Portal (USP) Architecture](./architecture/UNIFIED_SALES_PORTAL.md)**.

This document should be considered the single source of truth for the current implementation.

## Deprecated Components

The following components, originally specified in the `unified-sales-live-shopping` design, have been **deprecated** and are not part of the active codebase:

- **Live Shopping Sessions:** The feature for real-time, collaborative shopping sessions between clients and staff is not implemented.
- **Session-based Pricing:** The ability to apply temporary, session-specific price overrides is not available. All pricing is handled by the standard pricing engine.
- **Real-Time Sync Service:** The WebSocket-based service for real-time synchronization is not in use.
- **Sample Request Flow:** The workflow for clients to request physical samples during a session is not implemented.

These features may be considered for future development, but they are not part of the current system. All development and documentation should align with the architecture outlined in the new USP documentation.
