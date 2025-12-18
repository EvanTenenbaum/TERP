import { eq, inArray, and, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { orders, products, productTags, tags } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Get product recommendations for a client based on order history
 */
export async function getProductRecommendations(
  clientId: number,
  limit: number = 10
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get client's order history
    const clientOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.clientId, clientId));

    if (clientOrders.length === 0) {
      return { success: true, recommendations: [] };
    }

    // Extract product IDs from order items (JSON field)
    const purchasedProductIds: number[] = [];
    for (const order of clientOrders) {
      const items = order.items as any[];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.productId) {
            purchasedProductIds.push(item.productId);
          }
        }
      }
    }

    const uniquePurchasedIds = Array.from(new Set(purchasedProductIds));

    if (uniquePurchasedIds.length === 0) {
      return { success: true, recommendations: [] };
    }

    // Get tags from purchased products
    const purchasedProductTags = await db
      .select({
        productId: productTags.productId,
        tagId: productTags.tagId,
        tagName: tags.name,
      })
      .from(productTags)
      .leftJoin(tags, eq(productTags.tagId, tags.id))
      .where(inArray(productTags.productId, uniquePurchasedIds));

    // Count tag frequency
    const tagFrequency = new Map<number, number>();
    for (const pt of purchasedProductTags) {
      if (pt.tagId) {
        tagFrequency.set(pt.tagId, (tagFrequency.get(pt.tagId) || 0) + 1);
      }
    }

    // Get top tags
    const topTagEntries = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const topTags = topTagEntries.map((entry) => entry[0]);

    if (topTags.length === 0) {
      return { success: true, recommendations: [] };
    }

    // Find products with similar tags that haven't been purchased
    const recommendedProducts = await db
      .select({
        product: products,
        tagId: productTags.tagId,
      })
      .from(products)
      .leftJoin(productTags, eq(products.id, productTags.productId))
      .where(inArray(productTags.tagId, topTags));

    // Filter out already purchased products and score by tag overlap
    const productScores = new Map<number, { product: any; score: number }>();
    for (const rp of recommendedProducts) {
      if (!rp.product) continue;

      const productId = rp.product.id;
      
      // Skip if already purchased
      if (uniquePurchasedIds.includes(productId)) continue;

      if (!productScores.has(productId)) {
        productScores.set(productId, {
          product: rp.product,
          score: 0,
        });
      }

      // Increase score based on tag frequency
      const tagFreq = tagFrequency.get(rp.tagId!) || 0;
      productScores.get(productId)!.score += tagFreq;
    }

    // Sort by score and return top recommendations
    const recommendations = Array.from(productScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.product,
        recommendationScore: item.score,
        reason: "Based on your previous purchases",
      }));

    return { success: true, recommendations };
  } catch (error) {
    logger.error({ error }, "Error getting product recommendations");
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get similar products based on tags
 */
export async function getSimilarProducts(productId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get tags for the product
    const productTagsList = await db
      .select({
        tagId: productTags.tagId,
      })
      .from(productTags)
      .where(eq(productTags.productId, productId));

    if (productTagsList.length === 0) {
      return { success: true, similarProducts: [] };
    }

    const tagIds = productTagsList.map((pt) => pt.tagId);

    // Find other products with similar tags
    const similarProducts = await db
      .select({
        product: products,
        tagId: productTags.tagId,
      })
      .from(products)
      .leftJoin(productTags, eq(products.id, productTags.productId))
      .where(inArray(productTags.tagId, tagIds));

    // Score by tag overlap
    const productScores = new Map<number, { product: any; score: number }>();
    for (const sp of similarProducts) {
      if (!sp.product) continue;

      const pid = sp.product.id;
      
      // Skip the original product
      if (pid === productId) continue;

      if (!productScores.has(pid)) {
        productScores.set(pid, {
          product: sp.product,
          score: 0,
        });
      }
      productScores.get(pid)!.score += 1;
    }

    // Sort and return
    const similar = Array.from(productScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.product,
        similarityScore: item.score,
      }));

    return { success: true, similarProducts: similar };
  } catch (error) {
    logger.error({ error }, "Error getting similar products");
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get frequently bought together products
 */
export async function getFrequentlyBoughtTogether(
  productId: number,
  limit: number = 5
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Find orders containing this product
    const allOrders = await db.select().from(orders);

    const ordersWithProduct: number[] = [];
    for (const order of allOrders) {
      const items = order.items as any[];
      if (items && Array.isArray(items)) {
        const hasProduct = items.some((item: any) => item.productId === productId);
        if (hasProduct) {
          ordersWithProduct.push(order.id);
        }
      }
    }

    if (ordersWithProduct.length === 0) {
      return { success: true, frequentlyBoughtTogether: [] };
    }

    // Find other products in those orders
    const otherProductsMap = new Map<number, number>();
    
    for (const order of allOrders) {
      if (ordersWithProduct.includes(order.id)) {
        const items = order.items as any[];
        if (items && Array.isArray(items)) {
          for (const item of items) {
            if (item.productId && item.productId !== productId) {
              otherProductsMap.set(
                item.productId,
                (otherProductsMap.get(item.productId) || 0) + 1
              );
            }
          }
        }
      }
    }

    if (otherProductsMap.size === 0) {
      return { success: true, frequentlyBoughtTogether: [] };
    }

    // Get product details
    const productIds = Array.from(otherProductsMap.keys());
    const productDetails = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    // Build result with frequency
    const frequentlyBought = productDetails
      .map((product) => ({
        ...product,
        frequency: otherProductsMap.get(product.id) || 0,
        percentage: Math.round(
          ((otherProductsMap.get(product.id) || 0) / ordersWithProduct.length) * 100
        ),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);

    return { success: true, frequentlyBoughtTogether: frequentlyBought };
  } catch (error) {
    logger.error({ error }, "Error getting frequently bought together");
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

