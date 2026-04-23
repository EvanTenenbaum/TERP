/**
 * eslint-plugin-terp — local custom rules for the TERP codebase.
 *
 * Rules shipped in Sprint 1 (TER-1289 / TER-1290 / TER-1291):
 *   - terp/no-bare-card-loading         (TER-1289, warn)
 *   - terp/no-inline-text-right-on-coldef (TER-1290, error)
 *   - terp/prefer-powersheet-grid       (TER-1291, warn)
 *
 * Wired into `eslint.config.strict.js`. See each rule file for details.
 */

import noBareCardLoading from "./rules/no-bare-card-loading.js";
import noInlineTextRightOnColdef from "./rules/no-inline-text-right-on-coldef.js";
import preferPowersheetGrid from "./rules/prefer-powersheet-grid.js";

const plugin = {
  meta: {
    name: "eslint-plugin-terp",
    version: "0.1.0",
  },
  rules: {
    "no-bare-card-loading": noBareCardLoading,
    "no-inline-text-right-on-coldef": noInlineTextRightOnColdef,
    "prefer-powersheet-grid": preferPowersheetGrid,
  },
};

export default plugin;
