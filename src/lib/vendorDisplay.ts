/**
 * Vendor Display Utility Functions
 * 
 * This module handles vendor code masking as specified in CONTEXT.md.
 * 
 * Key Business Rule: VendorCode must be displayed everywhere except 
 * the vendor profile; exports respect this masking.
 */

import prisma from '@/lib/prisma';

export interface VendorDisplayInfo {
  id: string;
  displayName: string;
  vendorCode: string;
  companyName?: string; // Only included in vendor profile context
}

/**
 * Get vendor display information for general use (masked)
 * 
 * @param vendorId - The ID of the vendor
 * @returns Vendor info with vendorCode as display name
 */
export async function getVendorForDisplay(vendorId: string): Promise<VendorDisplayInfo | null> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        vendorCode: true
      }
    });

    if (!vendor) {
      return null;
    }

    return {
      id: vendor.id,
      displayName: vendor.vendorCode,
      vendorCode: vendor.vendorCode
    };
  } catch (error) {
    console.error('Error fetching vendor for display:', error);
    return null;
  }
}

/**
 * Get vendor information for profile view (unmasked)
 * 
 * @param vendorId - The ID of the vendor
 * @returns Complete vendor info including company name
 */
export async function getVendorForProfile(vendorId: string): Promise<VendorDisplayInfo | null> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        vendorCode: true,
        companyName: true
      }
    });

    if (!vendor) {
      return null;
    }

    return {
      id: vendor.id,
      displayName: vendor.companyName || vendor.vendorCode,
      vendorCode: vendor.vendorCode,
      companyName: vendor.companyName
    };
  } catch (error) {
    console.error('Error fetching vendor for profile:', error);
    return null;
  }
}

/**
 * Get multiple vendors for display in lists (masked)
 * 
 * @param vendorIds - Array of vendor IDs
 * @returns Array of vendor display info
 */
export async function getVendorsForDisplay(vendorIds: string[]): Promise<VendorDisplayInfo[]> {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        id: {
          in: vendorIds
        }
      },
      select: {
        id: true,
        vendorCode: true
      }
    });

    return vendors.map(vendor => ({
      id: vendor.id,
      displayName: vendor.vendorCode,
      vendorCode: vendor.vendorCode
    }));
  } catch (error) {
    console.error('Error fetching vendors for display:', error);
    return [];
  }
}

/**
 * Get all vendors for display in dropdowns/selects (masked)
 * 
 * @returns Array of all vendors with masked display names
 */
export async function getAllVendorsForDisplay(): Promise<VendorDisplayInfo[]> {
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        vendorCode: true
      },
      orderBy: {
        vendorCode: 'asc'
      }
    });

    return vendors.map(vendor => ({
      id: vendor.id,
      displayName: vendor.vendorCode,
      vendorCode: vendor.vendorCode
    }));
  } catch (error) {
    console.error('Error fetching all vendors for display:', error);
    return [];
  }
}

/**
 * Format vendor for export (respects masking rule)
 * 
 * @param vendorId - The ID of the vendor
 * @returns Vendor code for export use
 */
export async function getVendorForExport(vendorId: string): Promise<string> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        vendorCode: true
      }
    });

    return vendor?.vendorCode || 'Unknown Vendor';
  } catch (error) {
    console.error('Error fetching vendor for export:', error);
    return 'Unknown Vendor';
  }
}

/**
 * Search vendors by vendor code (for masked search)
 * 
 * @param searchTerm - Search term to match against vendor codes
 * @returns Array of matching vendors
 */
export async function searchVendorsByCode(searchTerm: string): Promise<VendorDisplayInfo[]> {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        vendorCode: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        vendorCode: true
      },
      orderBy: {
        vendorCode: 'asc'
      }
    });

    return vendors.map(vendor => ({
      id: vendor.id,
      displayName: vendor.vendorCode,
      vendorCode: vendor.vendorCode
    }));
  } catch (error) {
    console.error('Error searching vendors:', error);
    return [];
  }
}

/**
 * Validate vendor code uniqueness
 * 
 * @param vendorCode - The vendor code to validate
 * @param excludeId - Optional vendor ID to exclude from check (for updates)
 * @returns True if vendor code is unique
 */
export async function isVendorCodeUnique(vendorCode: string, excludeId?: string): Promise<boolean> {
  try {
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        vendorCode: vendorCode,
        ...(excludeId && { id: { not: excludeId } })
      }
    });

    return !existingVendor;
  } catch (error) {
    console.error('Error checking vendor code uniqueness:', error);
    return false;
  }
}

/**
 * Get vendor display name for UI components
 * This is a convenience function that always returns the vendor code
 * 
 * @param vendor - Vendor object with vendorCode
 * @returns The vendor code for display
 */
export function getVendorDisplayName(vendor: { vendorCode: string }): string {
  return vendor.vendorCode;
}

/**
 * Get vendor display name for profile context
 * This returns the company name if available, otherwise vendor code
 * 
 * @param vendor - Vendor object with vendorCode and optional companyName
 * @returns The appropriate display name for profile context
 */
export function getVendorProfileDisplayName(vendor: { 
  vendorCode: string; 
  companyName?: string | null 
}): string {
  return vendor.companyName || vendor.vendorCode;
}
