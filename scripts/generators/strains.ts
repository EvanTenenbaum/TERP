/**
 * Strain generation with normalization
 */

import { CONFIG } from './config.js';

export interface StrainData {
  id?: number;
  name: string;
  standardizedName: string;
  category: string;
  description: string;
  createdAt: Date;
}

/**
 * Generate 50 popular strains with normalization
 */
export function generateStrains(): StrainData[] {
  const strainData = [
    { name: 'Blue Dream', category: 'hybrid', description: 'Popular sativa-dominant hybrid' },
    { name: 'OG Kush', category: 'hybrid', description: 'Classic hybrid with earthy notes' },
    { name: 'Sour Diesel', category: 'sativa', description: 'Energizing sativa with diesel aroma' },
    { name: 'Girl Scout Cookies', category: 'hybrid', description: 'Sweet hybrid with high THC' },
    { name: 'Granddaddy Purple', category: 'indica', description: 'Relaxing indica with grape flavor' },
    { name: 'Jack Herer', category: 'sativa', description: 'Uplifting sativa named after cannabis activist' },
    { name: 'White Widow', category: 'hybrid', description: 'Balanced hybrid with white crystals' },
    { name: 'AK-47', category: 'hybrid', description: 'Potent hybrid with complex aroma' },
    { name: 'Northern Lights', category: 'indica', description: 'Classic indica for relaxation' },
    { name: 'Pineapple Express', category: 'hybrid', description: 'Tropical sativa-dominant hybrid' },
    { name: 'Gorilla Glue #4', category: 'hybrid', description: 'Heavy-hitting hybrid' },
    { name: 'Gelato', category: 'hybrid', description: 'Dessert-like hybrid strain' },
    { name: 'Wedding Cake', category: 'hybrid', description: 'Sweet indica-dominant hybrid' },
    { name: 'Zkittlez', category: 'indica', description: 'Fruity indica with candy flavor' },
    { name: 'Durban Poison', category: 'sativa', description: 'Pure African sativa' },
    { name: 'Bubba Kush', category: 'indica', description: 'Heavy indica for sleep' },
    { name: 'Strawberry Cough', category: 'sativa', description: 'Strawberry-flavored sativa' },
    { name: 'Purple Haze', category: 'sativa', description: 'Legendary sativa strain' },
    { name: 'Trainwreck', category: 'hybrid', description: 'Fast-acting hybrid' },
    { name: 'Green Crack', category: 'sativa', description: 'Energizing sativa' },
    { name: 'Chemdawg', category: 'hybrid', description: 'Diesel-scented hybrid' },
    { name: 'Super Silver Haze', category: 'sativa', description: 'Award-winning sativa' },
    { name: 'LA Confidential', category: 'indica', description: 'Smooth indica from LA' },
    { name: 'Maui Wowie', category: 'sativa', description: 'Hawaiian sativa' },
    { name: 'Blueberry', category: 'indica', description: 'Berry-flavored indica' },
    { name: 'Lemon Haze', category: 'sativa', description: 'Citrus sativa' },
    { name: 'Sunset Sherbet', category: 'indica', description: 'Sweet indica hybrid' },
    { name: 'Do-Si-Dos', category: 'indica', description: 'Cookie-flavored indica' },
    { name: 'Tangie', category: 'sativa', description: 'Tangerine-scented sativa' },
    { name: 'Cherry Pie', category: 'hybrid', description: 'Sweet cherry hybrid' },
    { name: 'Headband', category: 'hybrid', description: 'Pressure-relieving hybrid' },
    { name: 'Fire OG', category: 'hybrid', description: 'Potent OG variant' },
    { name: 'Skywalker OG', category: 'indica', description: 'Indica-dominant OG' },
    { name: 'Tahoe OG', category: 'hybrid', description: 'Mountain-grown OG' },
    { name: 'Cookies and Cream', category: 'hybrid', description: 'Dessert hybrid' },
    { name: 'Mimosa', category: 'sativa', description: 'Citrus sativa hybrid' },
    { name: 'Runtz', category: 'hybrid', description: 'Candy-flavored hybrid' },
    { name: 'Biscotti', category: 'indica', description: 'Cookie-flavored indica' },
    { name: 'Forbidden Fruit', category: 'indica', description: 'Tropical indica' },
    { name: 'Tropicana Cookies', category: 'sativa', description: 'Citrus sativa' },
    { name: 'Slurricane', category: 'indica', description: 'Fruity indica' },
    { name: 'MAC (Miracle Alien Cookies)', category: 'hybrid', description: 'Balanced hybrid' },
    { name: 'Dosidos', category: 'indica', description: 'Cookie-lineage indica' },
    { name: 'Wedding Crasher', category: 'hybrid', description: 'Wedding Cake variant' },
    { name: 'Ice Cream Cake', category: 'indica', description: 'Dessert indica' },
    { name: 'Jungle Boys', category: 'hybrid', description: 'Premium hybrid' },
    { name: 'Cereal Milk', category: 'hybrid', description: 'Sweet hybrid' },
    { name: 'Jealousy', category: 'hybrid', description: 'Gelato variant' },
    { name: 'Gushers', category: 'indica', description: 'Fruity indica' },
    { name: 'Papaya', category: 'indica', description: 'Tropical indica' },
  ];
  
  return strainData.map((strain, index) => ({
    name: strain.name,
    standardizedName: strain.name.toLowerCase().trim(), // Normalization
    category: strain.category,
    description: strain.description,
    createdAt: new Date(2023, 11, 1 + index),
  }));
}

