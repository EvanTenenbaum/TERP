<!-- bosun prompt: customToolReflect -->
<!-- bosun description: End-of-task reflection prompt: prompts agent to extract reusable logic into persistent custom tools. -->
<!-- bosun default-sha256: d62cd4bd67ab5471dcd046babd8299b663956c72f084a15d9314e6d7cd0857bb -->

## Reflect: Custom Tool Extraction

Before closing the task, check for reusable tooling:

1. **Did you write any utility code (≥ 10 lines) that you'd write again?**
   If yes — extract it into a persistent custom tool in `.bosun/tools/`.

2. **Did you encounter a repeated analysis pattern** (grep for a specific thing,
   parse a log format, transform a file structure)?
   If yes — package it as a custom tool so future agents skip the re-derivation.

3. **Did an existing custom tool help you?**
   Consider promoting it to global scope (`promoteToGlobal`).

4. **What category does the extracted logic fall into?**
   analysis | testing | git | build | transform | search | validation | utility

To register a tool:

```js
import { registerCustomTool } from "./agent-custom-tools.mjs";
registerCustomTool(rootDir, {
  title: "...", description: "...", category: "...", lang: "mjs",
  tags: [...], createdBy: agentId, taskId, script: `...`,
});
```

Extract only when reuse is clear. Skip one-off logic.
