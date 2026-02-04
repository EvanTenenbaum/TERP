import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

// AG Grid v35+ requires explicit module registration (even for Community features).
// Without this, grids fail to render at runtime with:
//   "AG Grid: error #272 No AG Grid modules are registered!"
ModuleRegistry.registerModules([AllCommunityModule]);

