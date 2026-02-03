# TERP Inventory Fix: Execution Plan

**Version:** 1.0
**Date:** 2026-02-02
**Status:** Awaiting Launch Command

## 1. Executive Summary

This document outlines a multi-agent execution plan to address the critical inventory filter chain bug and related issues in the TERP application. The plan is structured in waves to prioritize the most critical fix, allow for parallel work streams, and ensure stability through clear dependency management and verification gates. The primary goal is to restore core business functionality immediately while systematically addressing the underlying technical debt.

## 2. Agent Roles & Responsibilities

To maximize efficiency, the work will be distributed among specialized agents:

| Agent Role                  | Responsibilities                                                                    | Model               |
| :-------------------------- | :---------------------------------------------------------------------------------- | :------------------ |
| **Orchestrator (Manus)**    | Manages the overall plan, assigns tasks, verifies gates, and reports progress.      | `gemini-1.5-pro`    |
| **Hotfix Agent**            | Executes the single, critical P0 fix with surgical precision.                       | `gpt-5.1-codex-max` |
| **Inventory Backend Agent** | Implements the deeper backend fixes for the inventory filter chain.                 | `gpt-5.1-codex-max` |
| **Party Model Agent**       | Refactors `vendorId` logic to align with the `supplierClientId` party model.        | `gpt-5.1-codex-max` |
| **UI/UX Agent**             | Implements frontend improvements for filter visibility.                             | `gpt-5.1-codex-max` |
| **Reliability Agent**       | Continues the in-progress reliability work (WAVE-2026-02-02-A) in a parallel track. | `gpt-5.1-codex-max` |
| **QA Agent**                | Performs verification, regression testing, and ensures quality at each gate.        | `gpt-5.1-codex-max` |

## 3. Phased Execution Plan

The execution is divided into three waves, with specific tasks, agents, and dependencies.

### **Wave 0: Hotfix (P0) - Immediate**

- **Goal:** Restore basic inventory filtering to unblock business operations.
- **Estimated Time:** ~30 minutes
- **Launch:** Begins immediately upon receiving the 'go' command.

| Task ID            | Description                             | Agent        | Dependencies | Verification                                                               |
| :----------------- | :-------------------------------------- | :----------- | :----------- | :------------------------------------------------------------------------- |
| **INV-FILTER-001** | Reconnect status/category filters to DB | Hotfix Agent | None         | QA Agent verifies fix in a staging environment before a hotfix deployment. |

**Gate 0:** `INV-FILTER-001` must be deployed to production and verified before Wave 1 begins.

### **Wave 1: Parallel Sprint (P1) - Next 24 Hours**

- **Goal:** Complete the core inventory and party model fixes while the reliability sprint continues.
- **Estimated Time:** ~5-8 hours (parallel work)

| Track                    | Task ID             | Description                                           | Agent                   | Dependencies              |
| :----------------------- | :------------------ | :---------------------------------------------------- | :---------------------- | :------------------------ |
| **Track A: Inventory**   | **INV-FILTER-002**  | Extend DB layer for full filter support               | Inventory Backend Agent | `INV-FILTER-001` deployed |
| **Track B: Party Model** | **INV-PARTY-001**   | Rename `getBatchesByVendor` to `getBatchesBySupplier` | Party Model Agent       | None                      |
| **Track C: Reliability** | (WAVE-2026-02-02-A) | `REL-003`, `REL-005`, `REL-006`, `REL-017`            | Reliability Agent       | Continues existing work   |

**Gate 1:** All Wave 1 tasks must be completed, tested by the QA Agent, and merged to the main branch.

### **Wave 2: Beta Hardening (P2) - Next 48 Hours**

- **Goal:** Address remaining technical debt and improve user experience.
- **Estimated Time:** ~1.5 hours

| Task ID            | Description                                 | Agent                   | Dependencies               |
| :----------------- | :------------------------------------------ | :---------------------- | :------------------------- |
| **INV-FILTER-003** | Remove redundant client-side filters        | Inventory Backend Agent | `INV-FILTER-002` completed |
| **INV-FILTER-004** | Surface active filter indicator prominently | UI/UX Agent             | None                       |

**Gate 2:** All Wave 2 tasks completed and verified by the QA Agent.

## 4. Launch Command

Execution will commence once the user provides the following command:

> **go**
