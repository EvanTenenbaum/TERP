import { LicenseManager } from "ag-grid-enterprise";

export function normalizeAgGridLicenseKey(
  rawLicenseKey: string | null | undefined
) {
  const trimmedLicenseKey = rawLicenseKey?.trim();
  return trimmedLicenseKey ? trimmedLicenseKey : null;
}

const agGridLicenseKey = normalizeAgGridLicenseKey(
  import.meta.env.VITE_AG_GRID_LICENSE_KEY
);

export const isAgGridEnterpriseLicenseConfigured = agGridLicenseKey !== null;

if (agGridLicenseKey) {
  LicenseManager.setLicenseKey(agGridLicenseKey);
}
