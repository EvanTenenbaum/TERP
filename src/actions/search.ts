'use server';

import { PrismaClient } from '@prisma/client';
import { getActiveBatchCost } from '@/lib/cogs';
import { getVendorDisplayName } from '@/lib/vendorDisplay';

const prisma = new PrismaClient();

export interface SearchFilters {
  keyword?: string;
  category?: string;
  availability?: 'available' | 'low_stock' | 'out_of_stock';
  location?: string;
  vendorCode?: string;
  priceMin?: number;
  priceMax?: number;
  customerId?: string; // For price book precedence
}

export interface SearchResult {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  isActive: boolean;
  defaultPrice: number | null;
  displayPrice: number; // Price after applying price book precedence
  batch: {
    id: string;
    batchNumber: string;
    vendorCode: string;
    vendorDisplayName: string;
    activeCost: number;
  } | null;
  inventoryLot: {
    id: string;
    location: string;
    qtyOnHand: number;
    qtyAllocated: number;
    qtyAvailable: number;
    reorderPoint: number;
    availability: 'available' | 'low_stock' | 'out_of_stock';
  } | null;
  images: {
    id: string;
    filename: string;
    url: string;
  }[];
}

export async function searchProducts(filters: SearchFilters = {}): Promise<SearchResult[]> {
  try {
    const {
      keyword,
      category,
      availability,
      location,
      vendorCode,
      priceMin,
      priceMax,
      customerId
    } = filters;

    // Build the where clause for products
    const productWhere: any = {
      isActive: true,
    };

    if (keyword) {
      productWhere.OR = [
        { sku: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (category) {
      productWhere.category = category;
    }

    // Get products with related data
    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        batches: {
          include: {
            vendor: true,
            batchCosts: {
              orderBy: { effectiveFrom: 'desc' }
            },
            inventoryLots: true
          }
        },
        intakePhotos: true
      },
      orderBy: { name: 'asc' }
    });

    // Process results and apply additional filters
    const results: SearchResult[] = [];

    for (const product of products) {
      // Get the most recent batch for this product
      const latestBatch = product.batches
        .filter(batch => batch.inventoryLots.length > 0)
        .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime())[0];

      if (!latestBatch) continue;

      // Apply vendor filter
      if (vendorCode && latestBatch.vendor.vendorCode !== vendorCode) {
        continue;
      }

      // Get inventory lot (prefer the one matching location filter)
      let inventoryLot = latestBatch.inventoryLots[0];
      if (location) {
        const locationLot = latestBatch.inventoryLots.find(lot => lot.location === location);
        if (!locationLot) continue;
        inventoryLot = locationLot;
      }

      // Calculate availability
      const qtyAvailable = inventoryLot.qtyOnHand - inventoryLot.qtyAllocated;
      let lotAvailability: 'available' | 'low_stock' | 'out_of_stock';
      
      if (qtyAvailable <= 0) {
        lotAvailability = 'out_of_stock';
      } else if (inventoryLot.qtyOnHand <= inventoryLot.reorderPoint) {
        lotAvailability = 'low_stock';
      } else {
        lotAvailability = 'available';
      }

      // Apply availability filter
      if (availability && lotAvailability !== availability) {
        continue;
      }

      // Get active batch cost
      const activeCost = await getActiveBatchCost(latestBatch.id, new Date());

      // Calculate display price using price book precedence
      const displayPrice = await calculateDisplayPrice(product.id, customerId);

      // Apply price filters
      if (priceMin !== undefined && displayPrice < priceMin) {
        continue;
      }
      if (priceMax !== undefined && displayPrice > priceMax) {
        continue;
      }

      // Get vendor display name (masked)
      const vendorDisplayName = getVendorDisplayName(latestBatch.vendor, false);

      // Process images
      const images = product.intakePhotos.map(photo => ({
        id: photo.id,
        filename: photo.filename,
        url: `/api/images/${photo.filename}` // Assuming we have an image serving endpoint
      }));

      results.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        unit: product.unit,
        isActive: product.isActive,
        defaultPrice: product.defaultPrice,
        displayPrice,
        batch: {
          id: latestBatch.id,
          batchNumber: latestBatch.batchNumber,
          vendorCode: latestBatch.vendor.vendorCode,
          vendorDisplayName,
          activeCost
        },
        inventoryLot: {
          id: inventoryLot.id,
          location: inventoryLot.location,
          qtyOnHand: inventoryLot.qtyOnHand,
          qtyAllocated: inventoryLot.qtyAllocated,
          qtyAvailable,
          reorderPoint: inventoryLot.reorderPoint,
          availability: lotAvailability
        },
        images
      });
    }

    return results;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

async function calculateDisplayPrice(productId: string, customerId?: string): Promise<number> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return 0;

    let price = product.defaultPrice || 0;

    if (customerId) {
      // Get customer to determine role
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { role: true }
      });

      if (customer) {
        // Check for customer-specific price book entry
        const customerPriceEntry = await prisma.priceBookEntry.findFirst({
          where: {
            productId,
            priceBook: {
              customerId: customer.id
            }
          },
          include: { priceBook: true }
        });

        if (customerPriceEntry) {
          price = customerPriceEntry.price;
        } else if (customer.role) {
          // Check for role-based price book entry
          const rolePriceEntry = await prisma.priceBookEntry.findFirst({
            where: {
              productId,
              priceBook: {
                roleId: customer.role.id
              }
            },
            include: { priceBook: true }
          });

          if (rolePriceEntry) {
            price = rolePriceEntry.price;
          } else {
            // Check for global price book entry
            const globalPriceEntry = await prisma.priceBookEntry.findFirst({
              where: {
                productId,
                priceBook: {
                  isGlobal: true
                }
              },
              include: { priceBook: true }
            });

            if (globalPriceEntry) {
              price = globalPriceEntry.price;
            }
          }
        }
      }
    }

    return price;
  } catch (error) {
    console.error('Error calculating display price:', error);
    return 0;
  }
}

export async function getSearchFilterOptions() {
  try {
    const [categories, locations, vendors] = await Promise.all([
      // Get unique categories
      prisma.product.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category']
      }),
      
      // Get unique locations
      prisma.inventoryLot.findMany({
        select: { location: true },
        distinct: ['location']
      }),
      
      // Get vendors with their codes
      prisma.vendor.findMany({
        where: { isActive: true },
        select: { id: true, vendorCode: true, companyName: true },
        orderBy: { vendorCode: 'asc' }
      })
    ]);

    return {
      categories: categories.map(c => c.category).filter(Boolean),
      locations: locations.map(l => l.location).filter(Boolean),
      vendors: vendors.map(v => ({
        id: v.id,
        vendorCode: v.vendorCode,
        displayName: getVendorDisplayName(v, false)
      }))
    };
  } catch (error) {
    console.error('Error getting filter options:', error);
    return {
      categories: [],
      locations: [],
      vendors: []
    };
  }
}

export async function getProductDetails(productId: string, customerId?: string): Promise<SearchResult | null> {
  try {
    const results = await searchProducts({ customerId });
    return results.find(r => r.id === productId) || null;
  } catch (error) {
    console.error('Error getting product details:', error);
    return null;
  }
}

