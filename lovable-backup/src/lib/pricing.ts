import {
  PriceBook,
  PriceTier,
  ClientPriceProfile,
  ClientPriceOverride,
  PriceRule,
  Promo,
  UnitOfMeasure,
  PriceSource,
} from "@/types/entities";
import {
  mockPriceBook,
  mockPriceTiers,
  mockClientPriceProfiles,
  mockClientPriceOverrides,
  mockPriceRules,
  mockPromos,
  mockUOMs,
} from "@/lib/mockData";

export interface PriceResult {
  unit_price: number;
  price_source: PriceSource;
}

/**
 * GetPrice - Deterministic pricing engine
 * Precedence:
 * 1. ClientPriceOverride (if within dates)
 * 2. Active PriceRule (client or segment scoped; respect combinable)
 * 3. PriceTier on PriceBook.base_price
 * 4. Fallback PriceBook.base_price
 * 5. Apply Promo code if present & combinable
 * 6. If uom.factor_to_base != 1, scale price
 */
export function getPrice(
  clientId: string,
  inventoryId: string,
  date: Date = new Date(),
  uomId?: string,
  promoCode?: string
): PriceResult {
  const dateStr = date.toISOString().split("T")[0];

  // 1. Check ClientPriceOverride
  const override = mockClientPriceOverrides.find(
    (o) =>
      o.client_id === clientId &&
      o.inventory_id === inventoryId &&
      o.effective_from <= dateStr &&
      (!o.effective_to || o.effective_to >= dateStr)
  );

  if (override) {
    let finalPrice = override.fixed_price;
    let source: PriceSource = "override";

    // Apply UOM scaling if needed
    if (uomId) {
      const uom = mockUOMs.find((u) => u.id === uomId);
      if (uom) {
        if (uom.price_per_uom) {
          finalPrice = uom.price_per_uom;
          source = "uom_scale";
        } else {
          finalPrice = finalPrice * uom.factor_to_base;
          source = "uom_scale";
        }
      }
    }

    return { unit_price: finalPrice, price_source: source };
  }

  // 2. Check Active PriceRule
  const activeRule = mockPriceRules.find((r) => {
    if (!r.start || r.start > dateStr) return false;
    if (r.end && r.end < dateStr) return false;

    // Check if rule applies to this client
    const selector = r.selector as any;
    if (r.scope === "client" && selector.client_id === clientId) {
      // Check if inventory matches tags
      return true;
    }

    return false;
  });

  if (activeRule) {
    const priceBookEntry = mockPriceBook.find((p) => p.inventory_id === inventoryId && p.active);
    if (priceBookEntry) {
      let basePrice = priceBookEntry.base_price;

      // Apply rule effect
      if (activeRule.effect_type === "percent") {
        basePrice = basePrice * (1 + activeRule.effect_value / 100);
      } else {
        basePrice = activeRule.effect_value;
      }

      // Apply promo if combinable
      if (promoCode && activeRule.combinable) {
        const promo = mockPromos.find((p) => p.code === promoCode && p.combinable);
        if (promo && promo.start <= dateStr && (!promo.end || promo.end >= dateStr)) {
          if (promo.effect_type === "percent") {
            basePrice = basePrice * (1 + promo.effect_value / 100);
          }
        }
      }

      // Apply UOM
      if (uomId) {
        const uom = mockUOMs.find((u) => u.id === uomId);
        if (uom) {
          if (uom.price_per_uom) {
            return { unit_price: uom.price_per_uom, price_source: "uom_scale" };
          }
          basePrice = basePrice * uom.factor_to_base;
        }
      }

      return { unit_price: basePrice, price_source: "rule" };
    }
  }

  // 3. Check PriceTier
  const clientProfile = mockClientPriceProfiles.find(
    (p) =>
      p.client_id === clientId &&
      p.effective_from <= dateStr &&
      (!p.effective_to || p.effective_to >= dateStr)
  );

  const priceBookEntry = mockPriceBook.find((p) => p.inventory_id === inventoryId && p.active);

  if (clientProfile && priceBookEntry) {
    const tier = mockPriceTiers.find((t) => t.id === clientProfile.tier_id);
    if (tier) {
      let basePrice = priceBookEntry.base_price;
      basePrice = basePrice * (1 + tier.percent_adjustment / 100);

      // Apply promo if present
      if (promoCode) {
        const promo = mockPromos.find((p) => p.code === promoCode);
        if (promo && promo.start <= dateStr && (!promo.end || promo.end >= dateStr)) {
          if (promo.effect_type === "percent") {
            basePrice = basePrice * (1 + promo.effect_value / 100);
          }
        }
      }

      // Apply UOM
      if (uomId) {
        const uom = mockUOMs.find((u) => u.id === uomId);
        if (uom) {
          if (uom.price_per_uom) {
            return { unit_price: uom.price_per_uom, price_source: "uom_scale" };
          }
          basePrice = basePrice * uom.factor_to_base;
        }
      }

      return { unit_price: basePrice, price_source: "tier" };
    }
  }

  // 4. Fallback to base price
  if (priceBookEntry) {
    let basePrice = priceBookEntry.base_price;

    // Apply promo
    if (promoCode) {
      const promo = mockPromos.find((p) => p.code === promoCode);
      if (promo && promo.start <= dateStr && (!promo.end || promo.end >= dateStr)) {
        if (promo.effect_type === "percent") {
          basePrice = basePrice * (1 + promo.effect_value / 100);
          return { unit_price: basePrice, price_source: "promo" };
        }
      }
    }

    // Apply UOM
    if (uomId) {
      const uom = mockUOMs.find((u) => u.id === uomId);
      if (uom) {
        if (uom.price_per_uom) {
          return { unit_price: uom.price_per_uom, price_source: "uom_scale" };
        }
        basePrice = basePrice * uom.factor_to_base;
        return { unit_price: basePrice, price_source: "uom_scale" };
      }
    }

    return { unit_price: basePrice, price_source: "base" };
  }

  // Fallback to inventory unit_price if no price book entry
  return { unit_price: 0, price_source: "base" };
}
