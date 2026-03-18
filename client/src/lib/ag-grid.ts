import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";

// AG Grid v35+ requires explicit module registration.
// Register the enterprise bundle once in the spreadsheet-native grid bootstrap so
// workbook surfaces can opt into Enterprise-only features without widening the
// blast radius to the whole app shell.
ModuleRegistry.registerModules([AllEnterpriseModule]);

const agGridLicenseKey = import.meta.env.VITE_AG_GRID_LICENSE_KEY?.trim();

if (agGridLicenseKey) {
  LicenseManager.setLicenseKey(agGridLicenseKey);
}
