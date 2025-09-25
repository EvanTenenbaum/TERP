'use server';

import prisma from '@/lib/prisma';

export interface SearchFilters {
  keyword?: string;
  category?: string;
  availability?: 'available' | 'low_stock' | 'out_of_stock';
  location?: string;
  vendorCode?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  location?: string;
  defaultPrice: number;
  currentPrice: number; // From price book or default
  availability: 'available' | 'low_stock' | 'out_of_stock';
  quantityAvailable: number;
  vendorCode: string;
  vendorName: string;
  batchId?: string;
  lotNumber?: string;
  photos: string[];
}

import { getEffectiveUnitPrice } from '@/lib/pricing';

export async function searchProducts(filters: SearchFilters = {}): Promise<SearchResult[]> {
  try {
    const {
      keyword,
      category,
      availability,
      location,
      vendorCode,
      minPrice,
      maxPrice
    } = filters;

    // Build where clause
    const where: any = {
      isActive: true
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { sku: { contains: keyword, mode: 'insensitive' } },
        { category: { contains: keyword, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (location) {
      where.location = location;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.defaultPrice = {};
      if (minPrice !== undefined) where.defaultPrice.gte = minPrice;
      if (maxPrice !== undefined) where.defaultPrice.lte = maxPrice;
    }

    // Get products with their batches and inventory
    const products = await prisma.product.findMany({
      where,
      include: {
        batches: {
          include: {
            vendor: true,
            batchCosts: {
              orderBy: { effectiveFrom: 'desc' },
              take: 1
            },
            inventoryLot: true
          }
        },
        photos: true
      },
      orderBy: { name: 'asc' }
    });

    const results: SearchResult[] = [];

    for (const product of products) {
      // Get the most recent batch with inventory
      const availableBatch = product.batches
        .filter(batch => batch.inventoryLot && batch.inventoryLot.quantityAvailable > 0)
        .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())[0];

      if (!availableBatch && availability === 'available') continue;

      const batch = availableBatch || product.batches[0];
      if (!batch) continue;

      // Apply vendor filter
      if (vendorCode && batch.vendor.vendorCode !== vendorCode) continue;

      const quantityAvailable = batch.inventoryLot?.quantityAvailable || 0;
      
      // Determine availability status
      let availabilityStatus: 'available' | 'low_stock' | 'out_of_stock';
      if (quantityAvailable === 0) {
        availabilityStatus = 'out_of_stock';
      } else if (quantityAvailable <= 10) { // Simple threshold
        availabilityStatus = 'low_stock';
      } else {
        availabilityStatus = 'available';
      }

      // Apply availability filter
      if (availability && availabilityStatus !== availability) continue;

      const effectivePrice = await getEffectiveUnitPrice(prisma as any, product.id);

      results.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        location: product.location || undefined,
        defaultPrice: product.defaultPrice,
        currentPrice: effectivePrice,
        availability: availabilityStatus,
        quantityAvailable,
        vendorCode: batch.vendor.vendorCode,
        vendorName: batch.vendor.companyName,
        batchId: batch.id,
        lotNumber: batch.lotNumber,
        photos: product.photos.map(photo => photo.filePath)
      });
    }

    return results;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

export async function getSearchFilterOptions() {
  try {
    const [categories, locations, vendors] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category']
      }),
      prisma.product.findMany({
        where: { 
          isActive: true,
          location: { not: null }
        },
        select: { location: true },
        distinct: ['location']
      }),
      prisma.vendor.findMany({
        where: { isActive: true },
        select: { vendorCode: true, companyName: true }
      })
    ]);

    return {
      categories: categories.map(c => c.category),
      locations: locations.map(l => l.location).filter(Boolean),
      vendors: vendors.map(v => ({
        code: v.vendorCode,
        name: v.companyName
      }))
    };
  } catch (error) {
    console.error('Error fetching search filters:', error);
    return {
      categories: [],
      locations: [],
      vendors: []
    };
  }
}
