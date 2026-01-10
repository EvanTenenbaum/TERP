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
  productCategory: string;  // Matches schema column name
  defaultMarginPercent: string;  // Matches schema column name
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
  "Tinctures",
  "Accessories",
  "Seeds",
  "Beverages",
  "OTHER",    // CRITICAL: Fallback used by orders.ts
  "DEFAULT",  // Global fallback
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
    // Different margins for different categories (as percentages 0-100)
    let defaultMarginPercent: number;

    switch (category) {
      case "Flower":
        defaultMarginPercent = 35.0;
        break;
      case "Pre-Rolls":
        defaultMarginPercent = 40.0;
        break;
      case "Concentrates":
        defaultMarginPercent = 45.0;
        break;
      case "Edibles":
        defaultMarginPercent = 50.0;
        break;
      case "Vapes":
        defaultMarginPercent = 40.0;
        break;
      case "Topicals":
        defaultMarginPercent = 55.0;
        break;
      case "Tinctures":
        defaultMarginPercent = 40.0;
        break;
      case "Accessories":
        defaultMarginPercent = 50.0;
        break;
      case "Seeds":
        defaultMarginPercent = 45.0;
        break;
      case "Beverages":
        defaultMarginPercent = 35.0;
        break;
      case "OTHER":
      case "DEFAULT":
        defaultMarginPercent = 30.0;  // Safe fallback margin
        break;
      default:
        defaultMarginPercent = 35.0;
    }

    pricingDefaults.push({
      productCategory: category,
      defaultMarginPercent: defaultMarginPercent.toFixed(2),
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
