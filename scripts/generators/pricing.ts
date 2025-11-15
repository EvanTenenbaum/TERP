/**
 * Pricing Generator
 *
 * Generates realistic pricing structures:
 * - Pricing rules (volume discounts, client-specific pricing)
 * - Pricing profiles (tier-based pricing)
 * - Pricing defaults (base margins, markup rules)
 *
 * This supports the pricing engine for dynamic order pricing
 */

import { CONFIG } from "./config.js";
import { faker } from "@faker-js/faker";

export interface PricingRuleData {
  id?: number;
  ruleName: string;
  ruleType: string;
  clientId?: number;
  productId?: number;
  minQuantity?: string;
  maxQuantity?: string;
  discountPercent?: string;
  fixedPrice?: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingProfileData {
  id?: number;
  profileName: string;
  description?: string;
  baseMargin: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingDefaultData {
  id?: number;
  category: string;
  defaultMargin: string;
  minMargin: string;
  maxMargin: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingCascadeResult {
  pricingRules: PricingRuleData[];
  pricingProfiles: PricingProfileData[];
  pricingDefaults: PricingDefaultData[];
}

const RULE_TYPES = [
  "VOLUME_DISCOUNT",
  "CLIENT_SPECIFIC",
  "PRODUCT_SPECIFIC",
  "BULK_PRICING",
  "PROMOTIONAL",
];

const PRODUCT_CATEGORIES = [
  "Flower",
  "Pre-Rolls",
  "Concentrates",
  "Edibles",
  "Vapes",
  "Topicals",
];

/**
 * Generate pricing rules, profiles, and defaults
 */
export function generatePricing(
  clientIds: number[],
  productIds: number[]
): PricingCascadeResult {
  const pricingRules: PricingRuleData[] = [];
  const pricingProfiles: PricingProfileData[] = [];
  const pricingDefaults: PricingDefaultData[] = [];

  // ========================================================================
  // PRICING PROFILES
  // ========================================================================

  // Create 3-5 pricing profiles
  const profileNames = [
    "Standard",
    "Premium",
    "VIP",
    "Wholesale",
    "Promotional",
  ];

  for (let i = 0; i < 5; i++) {
    const baseMargin = 0.2 + i * 0.1; // 20%, 30%, 40%, 50%, 60%

    pricingProfiles.push({
      profileName: profileNames[i],
      description: `${profileNames[i]} pricing tier`,
      baseMargin: baseMargin.toFixed(2),
      isDefault: i === 0, // Standard is default
      createdAt: new Date(2023, 10, 1),
      updatedAt: new Date(2023, 10, 1),
    });
  }

  // ========================================================================
  // PRICING DEFAULTS (by category)
  // ========================================================================

  for (const category of PRODUCT_CATEGORIES) {
    // Different margins for different categories
    let defaultMargin: number;
    let minMargin: number;
    let maxMargin: number;

    switch (category) {
      case "Flower":
        defaultMargin = 0.35;
        minMargin = 0.15;
        maxMargin = 0.60;
        break;
      case "Pre-Rolls":
        defaultMargin = 0.40;
        minMargin = 0.20;
        maxMargin = 0.65;
        break;
      case "Concentrates":
        defaultMargin = 0.45;
        minMargin = 0.25;
        maxMargin = 0.70;
        break;
      case "Edibles":
        defaultMargin = 0.50;
        minMargin = 0.30;
        maxMargin = 0.75;
        break;
      case "Vapes":
        defaultMargin = 0.40;
        minMargin = 0.20;
        maxMargin = 0.65;
        break;
      case "Topicals":
        defaultMargin = 0.55;
        minMargin = 0.35;
        maxMargin = 0.80;
        break;
      default:
        defaultMargin = 0.35;
        minMargin = 0.15;
        maxMargin = 0.60;
    }

    pricingDefaults.push({
      category,
      defaultMargin: defaultMargin.toFixed(2),
      minMargin: minMargin.toFixed(2),
      maxMargin: maxMargin.toFixed(2),
      createdAt: new Date(2023, 10, 1),
      updatedAt: new Date(2023, 10, 1),
    });
  }

  // ========================================================================
  // PRICING RULES
  // ========================================================================

  // Volume Discount Rules (10-15 rules)
  for (let i = 0; i < 12; i++) {
    const minQty = [10, 25, 50, 100, 250][Math.floor(Math.random() * 5)];
    const maxQty = minQty * 5;
    const discount = 0.05 + Math.random() * 0.15; // 5-20% discount

    pricingRules.push({
      ruleName: `Volume Discount - ${minQty}+ units`,
      ruleType: "VOLUME_DISCOUNT",
      minQuantity: minQty.toString(),
      maxQuantity: maxQty.toString(),
      discountPercent: discount.toFixed(2),
      priority: 10,
      isActive: true,
      createdAt: new Date(2023, 10, 1),
      updatedAt: new Date(2023, 10, 1),
    });
  }

  // Client-Specific Rules (20-30 rules for top clients)
  const topClientCount = Math.min(30, clientIds.length);
  for (let i = 0; i < topClientCount; i++) {
    const clientId = clientIds[i];
    const discount = 0.03 + Math.random() * 0.12; // 3-15% discount

    pricingRules.push({
      ruleName: `VIP Client Discount - Client ${clientId}`,
      ruleType: "CLIENT_SPECIFIC",
      clientId,
      discountPercent: discount.toFixed(2),
      priority: 20,
      isActive: true,
      createdAt: new Date(2023, 10, 1),
      updatedAt: new Date(2023, 10, 1),
    });
  }

  // Product-Specific Rules (15-20 rules)
  for (let i = 0; i < 18; i++) {
    const productId = productIds[Math.floor(Math.random() * productIds.length)];
    const isDiscount = Math.random() < 0.7;

    if (isDiscount) {
      const discount = 0.05 + Math.random() * 0.10; // 5-15% discount
      pricingRules.push({
        ruleName: `Product Promotion - Product ${productId}`,
        ruleType: "PROMOTIONAL",
        productId,
        discountPercent: discount.toFixed(2),
        priority: 15,
        isActive: Math.random() < 0.8, // 80% active
        createdAt: new Date(2023, 10, 1),
        updatedAt: new Date(2023, 10, 1),
      });
    } else {
      const fixedPrice = 50 + Math.random() * 200; // $50-$250
      pricingRules.push({
        ruleName: `Fixed Price - Product ${productId}`,
        ruleType: "PRODUCT_SPECIFIC",
        productId,
        fixedPrice: fixedPrice.toFixed(2),
        priority: 25,
        isActive: Math.random() < 0.9, // 90% active
        createdAt: new Date(2023, 10, 1),
        updatedAt: new Date(2023, 10, 1),
      });
    }
  }

  // Bulk Pricing Rules (8-10 rules)
  for (let i = 0; i < 9; i++) {
    const minQty = [100, 250, 500, 1000][Math.floor(Math.random() * 4)];
    const discount = 0.10 + Math.random() * 0.20; // 10-30% discount

    pricingRules.push({
      ruleName: `Bulk Pricing - ${minQty}+ units`,
      ruleType: "BULK_PRICING",
      minQuantity: minQty.toString(),
      discountPercent: discount.toFixed(2),
      priority: 5,
      isActive: true,
      createdAt: new Date(2023, 10, 1),
      updatedAt: new Date(2023, 10, 1),
    });
  }

  return {
    pricingRules,
    pricingProfiles,
    pricingDefaults,
  };
}
