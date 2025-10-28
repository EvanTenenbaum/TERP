/**
 * Product generation (strains × grow types × grades)
 */

import { CONFIG } from './config.js';
import { generateStrains } from './strains.js';

export interface ProductData {
  id?: number;
  brandId: number;
  nameCanonical: string;
  category: string;
  subcategory: string;
  uomSellable: string;
  description: string;
  createdAt: Date;
}

/**
 * Generate products from strains (90% flower)
 */
export function generateProducts(): ProductData[] {
  const products: ProductData[] = [];
  const strains = generateStrains();
  
  const growTypes = [
    { name: 'Indoor', price: CONFIG.indoorPrice, percentage: CONFIG.indoorPercentage },
    { name: 'Greenhouse', price: CONFIG.greenhousePrice, percentage: CONFIG.greenhousePercentage },
    { name: 'Outdoor', price: CONFIG.outdoorPrice, percentage: CONFIG.outdoorPercentage },
  ];
  
  const grades = ['AAA', 'AA', 'A'];
  
  // Generate flower products (strain × grow type × grade)
  let productId = 1;
  for (const strain of strains) {
    for (const growType of growTypes) {
      for (const grade of grades) {
        products.push({
          brandId: 1, // Default brand ID
          nameCanonical: `${strain.name} - ${growType.name} - ${grade}`,
          category: 'Flower',
          subcategory: growType.name,
          uomSellable: 'LB',
          description: `${grade} grade ${strain.name} grown ${growType.name.toLowerCase()}`,
          createdAt: new Date(2023, 11, 1),
        });
      }
    }
  }
  
  // Generate non-flower products (10% of total)
  const nonFlowerCategories = [
    { category: 'Concentrates', subcategories: ['Shatter', 'Wax', 'Live Resin', 'Distillate'] },
    { category: 'Edibles', subcategories: ['Gummies', 'Chocolates', 'Baked Goods'] },
    { category: 'Pre-Rolls', subcategories: ['Single', 'Multi-Pack'] },
    { category: 'Vapes', subcategories: ['Cartridges', 'Disposables'] },
  ];
  
  for (const cat of nonFlowerCategories) {
    for (const subcat of cat.subcategories) {
      // Use popular strains for non-flower products
      const popularStrains = strains.slice(0, 10);
      for (const strain of popularStrains) {
        products.push({
          brandId: 1, // Default brand ID
          nameCanonical: `${strain.name} - ${subcat}`,
          category: cat.category,
          subcategory: subcat,
          uomSellable: 'EA',
          description: `${strain.name} ${cat.category.toLowerCase()}`,
          createdAt: new Date(2023, 11, 1),
        });
      }
    }
  }
  
  return products;
}

