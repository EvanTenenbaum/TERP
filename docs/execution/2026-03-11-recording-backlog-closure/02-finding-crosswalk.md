# Finding Crosswalk

Date: 2026-03-11
Scope: March 10 recording backlog closure Wave 0.

This crosswalk is generated from the authoritative ledger and the active atomic issue set `TER-690` through `TER-714`.

## Summary

- Total rows: `247`
- Narrated rows: `242`
- Visual-only rows: `5`

## TER-690 - Coverage ledger and baseline carry-forward

- Proof contract: `report cross-check`
- Row count: `76`
- URL: https://linear.app/terpcorp/issue/ter-690/coverage-ledger-and-baseline-carry-forward

| Row IDs                                                                | Current states                                                                                                          | Notes                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| C001, C002, C003, C004, C005, C006, C007, C008, C009, C010, C011, C012 | C001=rejected with evidence, C002=closed with evidence, C003=rejected with evidence, C004=closed with evidence, ...     | Non-actionable transcript filler.                                                       |
| C013, C015, C016, C017, C018, C020, C021, C022, C024, C025, C027, C028 | C013=closed with evidence, C015=rejected with evidence, C016=rejected with evidence, C017=rejected with evidence, ...   | Core stale filter persistence was removed on touched surfaces in the low-rebuild slice. |
| C029, C031, C032, C033, C034, C035, C037, C038, C042, C049, C050, C051 | C029=rejected with evidence, C031=rejected with evidence, C032=rejected with evidence, C033=rejected with evidence, ... | Acknowledgement only.                                                                   |
| C054, C058, C059, C066, C067, C068, C069, C072, C093, C094, C095, C096 | C054=rejected with evidence, C058=rejected with evidence, C059=rejected with evidence, C066=rejected with evidence, ... | Context-setting or already-carried-forward note pending explicit replay reuse.          |
| C098, C099, C102, C104, C105, C106, C107, C109, C110, C112, C114, C115 | C098=rejected with evidence, C099=rejected with evidence, C102=rejected with evidence, C104=rejected with evidence, ... | Context-setting or already-carried-forward note pending explicit replay reuse.          |
| C116, C117, C121, C122, C123, C154, C165, C175, C176, C177, C178, C179 | C116=rejected with evidence, C117=rejected with evidence, C121=closed with evidence, C122=closed with evidence, ...     | Context-setting or already-carried-forward note pending explicit replay reuse.          |
| C240, C241, C242, V-SF-02                                              | C240=rejected with evidence, C241=rejected with evidence, C242=rejected with evidence, V-SF-02=closed with evidence     | Context-setting or already-carried-forward note pending explicit replay reuse.          |

## TER-694 - Quote edit / duplicate / convert proof

- Proof contract: `browser replay plus code trace`
- Row count: `4`
- URL: https://linear.app/terpcorp/issue/ter-694/quote-edit---duplicate---convert-proof

| Row IDs                | Current states                                         | Notes                                                                    |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| C039, C040, C041, C048 | C039=partial, C040=partial, C041=partial, C048=partial | Quote edit affordances exist, but seeded browser proof is still missing. |

## TER-695 - Returns from transaction context

- Proof contract: `role-aware browser replay plus logic proof`
- Row count: `6`
- URL: https://linear.app/terpcorp/issue/ter-695/returns-from-transaction-context

| Row IDs                            | Current states                                              | Notes                                                                                            |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| C060, C061, C062, C063, C064, C065 | C060=partial, C061=partial, C062=partial, C063=partial, ... | Returns logic exists, but true transaction-context replay under the right role is still missing. |

## TER-696 - Pricing profile propagation

- Proof contract: `pricing logic tests plus browser replay`
- Row count: `4`
- URL: https://linear.app/terpcorp/issue/ter-696/pricing-profile-propagation

| Row IDs                | Current states                             | Notes                                                |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------- |
| C053, C055, C097, C101 | C053=open, C055=open, C097=open, C101=open | Pricing profile propagation remains materially open. |

## TER-697 - Margin and FIFO clarity

- Proof contract: `pricing logic proof plus browser replay`
- Row count: `3`
- URL: https://linear.app/terpcorp/issue/ter-697/margin-and-fifo-clarity

| Row IDs          | Current states                  | Notes                                               |
| ---------------- | ------------------------------- | --------------------------------------------------- |
| C108, C118, C119 | C108=open, C118=open, C119=open | No current evidence packet has yet closed this row. |

## TER-698 - Sales UI cleanup

- Proof contract: `browser replay`
- Row count: `30`
- URL: https://linear.app/terpcorp/issue/ter-698/sales-ui-cleanup

| Row IDs                                                                | Current states                                        | Notes                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| C014, C019, C023, C026, C030, C036, C043, C044, C045, C046, C047, C056 | C014=open, C019=open, C023=open, C026=open, ...       | Status sorting is still not explicitly proven or closed in the active backlog. |
| C057, C070, C071, C081, C082, C083, C084, C085, C086, C087, C088, C089 | C057=open, C070=partial, C071=partial, C081=open, ... | Sales workspace density and blank-space cleanup remain open.                   |
| C090, C091, C092, C113, C120, V-SF-01                                  | C090=open, C091=open, C092=open, C113=open, ...       | No current evidence packet has yet closed this row.                            |

## TER-699 - Shipping vocabulary simplification

- Proof contract: `status mapping artifact plus browser replay`
- Row count: `6`
- URL: https://linear.app/terpcorp/issue/ter-699/shipping-vocabulary-simplification

| Row IDs                            | Current states                                  | Notes                                               |
| ---------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| C173, C184, C187, C192, C193, C194 | C173=open, C184=open, C187=open, C192=open, ... | No current evidence packet has yet closed this row. |

## TER-700 - Shipping truthfulness and stale filters

- Proof contract: `browser replay`
- Row count: `2`
- URL: https://linear.app/terpcorp/issue/ter-700/shipping-truthfulness-and-stale-filters

| Row IDs       | Current states          | Notes                                                    |
| ------------- | ----------------------- | -------------------------------------------------------- |
| C182, V-SF-04 | C182=open, V-SF-04=open | Shipping false-empty/stale-state behavior is still open. |

## TER-701 - Shipping operator proof

- Proof contract: `role-aware browser replay`
- Row count: `5`
- URL: https://linear.app/terpcorp/issue/ter-701/shipping-operator-proof

| Row IDs                      | Current states                                              | Notes                                                                     |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| C183, C188, C189, C190, C191 | C183=partial, C188=partial, C189=partial, C190=partial, ... | Shipping actions exist, but role-aware end-to-end proof is still missing. |

## TER-702 - Operations chrome compression

- Proof contract: `browser replay`
- Row count: `13`
- URL: https://linear.app/terpcorp/issue/ter-702/operations-chrome-compression

| Row IDs                                                                | Current states                                  | Notes                                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| C111, C155, C156, C157, C158, C159, C160, C161, C162, C163, C164, C169 | C111=open, C155=open, C156=open, C157=open, ... | No current evidence packet has yet closed this row.                                         |
| V-SF-03                                                                | V-SF-03=partial                                 | Operator-facing raw payload leakage was reduced, but a fresh live replay is still required. |

## TER-703 - Inventory first-class workspace

- Proof contract: `browser replay plus route/IA proof`
- Row count: `11`
- URL: https://linear.app/terpcorp/issue/ter-703/inventory-first-class-workspace

| Row IDs                                                          | Current states                                  | Notes                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| C166, C167, C168, C170, C171, C172, C174, C180, C181, C185, C186 | C166=open, C167=open, C168=open, C170=open, ... | Inventory is still nested inside Operations rather than being a first-class workspace. |

## TER-704 - Simplified samples model

- Proof contract: `state-model mapping plus test proof`
- Row count: `7`
- URL: https://linear.app/terpcorp/issue/ter-704/simplified-samples-model

| Row IDs                                  | Current states                                                    | Notes                                  |
| ---------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| C196, C197, C198, C199, C200, C201, C202 | C196=open, C197=open, C198=open, C199=rejected with evidence, ... | Simplified samples model remains open. |

## TER-706 - Photography queue redesign

- Proof contract: `browser replay`
- Row count: `16`
- URL: https://linear.app/terpcorp/issue/ter-706/photography-queue-redesign

| Row IDs                                                                | Current states                                      | Notes                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| C100, C103, C203, C204, C205, C206, C207, C208, C209, C210, C211, C212 | C100=open, C103=open, C203=open, C204=open, ...     | No current evidence packet has yet closed this row. |
| C213, C214, C215, C216                                                 | C213=open, C214=partial, C215=partial, C216=partial | Photography queue simplification remains open.      |

## TER-707 - Photography camera/upload fallback

- Proof contract: `browser replay under denied camera plus upload fallback`
- Row count: `2`
- URL: https://linear.app/terpcorp/issue/ter-707/photography-camera-upload-fallback

| Row IDs       | Current states          | Notes                                |
| ------------- | ----------------------- | ------------------------------------ |
| C195, V-SF-05 | C195=open, V-SF-05=open | Camera/upload fallback remains open. |

## TER-708 - Accounting quick-action landing

- Proof contract: `browser before/after on staging`
- Row count: `5`
- URL: https://linear.app/terpcorp/issue/ter-708/accounting-quick-action-landing

| Row IDs                      | Current states                                  | Notes                                                               |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| C052, C217, C218, C221, C228 | C052=open, C217=open, C218=open, C221=open, ... | Accounting quick-action priority is still open in the finance lane. |

## TER-709 - Credit capacity vs adjustments semantics

- Proof contract: `browser replay plus terminology proof`
- Row count: `5`
- URL: https://linear.app/terpcorp/issue/ter-709/credit-capacity-vs-adjustments-semantics

| Row IDs                      | Current states                                  | Notes                                  |
| ---------------------------- | ----------------------------------------------- | -------------------------------------- |
| C231, C232, C233, C234, C236 | C231=open, C232=open, C233=open, C234=open, ... | Credit semantics cleanup remains open. |

## TER-710 - Finance hierarchy and dashboard-first credits

- Proof contract: `browser replay`
- Row count: `14`
- URL: https://linear.app/terpcorp/issue/ter-710/finance-hierarchy-and-dashboard-first-credits

| Row IDs                                                                | Current states                                                                      | Notes                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| C219, C220, C222, C223, C224, C225, C226, C227, C229, C230, C235, C237 | C219=open, C220=rejected with evidence, C222=rejected with evidence, C223=open, ... | Finance hierarchy cleanup remains open.             |
| C238, C239                                                             | C238=open, C239=open                                                                | No current evidence packet has yet closed this row. |

## TER-711 - Relationships terminology cleanup

- Proof contract: `browser label audit`
- Row count: `6`
- URL: https://linear.app/terpcorp/issue/ter-711/relationships-terminology-cleanup

| Row IDs                            | Current states                                  | Notes                                    |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| C136, C137, C139, C140, C145, C146 | C136=open, C137=open, C139=open, C140=open, ... | Terminology cleanup is not yet complete. |

## TER-712 - Lightweight relationships create/edit flow

- Proof contract: `browser create/edit replay`
- Row count: `32`
- URL: https://linear.app/terpcorp/issue/ter-712/lightweight-relationships-create-edit-flow

| Row IDs                                                                | Current states                                                                      | Notes                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| C073, C074, C075, C076, C077, C078, C079, C080, C124, C125, C126, C127 | C073=open, C074=open, C075=open, C076=open, ...                                     | Referral attribution vs compensation home still needs explicit closure mapping. |
| C128, C129, C130, C131, C132, C133, C134, C135, C138, C141, C142, C143 | C128=rejected with evidence, C129=open, C130=open, C131=rejected with evidence, ... | Transcript filler or acknowledgment without a separate product request.         |
| C144, C147, C148, C149, C150, C151, C152, C153                         | C144=open, C147=open, C148=open, C149=rejected with evidence, ...                   | Lightweight first-pass field set is not yet complete.                           |
