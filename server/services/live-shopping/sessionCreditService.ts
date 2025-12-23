/**
 * Session Credit Service (P4-T04)
 * Handles validation of session cart against client credit limits
 */
import { getDb } from "../../db";
import { eq } from "drizzle-orm";
import { clients } from "../../../drizzle/schema";
import { sessionCartService } from "./sessionCartService";
import { financialMath } from "../../utils/financialMath";

export interface CreditValidationResult {
  isApproved: boolean;
  creditLimit: number;
  currentExposure: number;
  cartTotal: number;
  projectedExposure: number;
  remainingCredit: number;
  message: string;
  warningLevel: "NONE" | "APPROACHING" | "EXCEEDED";
}

export const sessionCreditService = {
  /**
   * Calculate the total value of the current session cart
   * Excluding items marked as samples
   */
  async getCartTotal(sessionId: number): Promise<string> {
    const cart = await sessionCartService.getCart(sessionId);

    // Filter out samples from total calculation
    const billableItems = cart.items.filter((item) => !item.isSample);

    let total = "0.00";
    for (const item of billableItems) {
      const lineTotal = financialMath.multiply(
        item.quantity.toString(),
        item.unitPrice.toString()
      );
      total = financialMath.add(total, lineTotal);
    }

    return total;
  },

  /**
   * Validate if the client has enough credit for the current cart
   */
  async validateCartCredit(
    sessionId: number,
    clientId: number
  ): Promise<CreditValidationResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 1. Get Cart Total
    const cartTotalStr = await this.getCartTotal(sessionId);
    const cartTotal = parseFloat(cartTotalStr);

    // 2. Get Client Credit Profile
    // TERP stores credit info directly on the clients table
    const clientRecord = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!clientRecord) {
      throw new Error("Client not found");
    }

    // Credit limit and exposure from client record
    // Assuming these fields exist on the clients table based on TERP patterns
    const limit = clientRecord.creditLimit
      ? parseFloat(clientRecord.creditLimit.toString())
      : 0;
    const exposure = clientRecord.creditExposure
      ? parseFloat(clientRecord.creditExposure.toString())
      : 0;

    const projectedExposure = exposure + cartTotal;
    const remainingCredit = limit - exposure;
    const isApproved = limit === 0 || projectedExposure <= limit; // 0 limit = unlimited

    // Determine warning level
    let warningLevel: "NONE" | "APPROACHING" | "EXCEEDED" = "NONE";
    let message = "Credit Check Passed";

    if (!isApproved) {
      warningLevel = "EXCEEDED";
      message = `Credit Limit Exceeded. Available: $${remainingCredit.toFixed(2)}, Cart: $${cartTotal.toFixed(2)}`;
    } else if (limit > 0 && remainingCredit < cartTotal * 1.5) {
      warningLevel = "APPROACHING";
      message = `Warning: Approaching Credit Limit (${((projectedExposure / limit) * 100).toFixed(0)}% utilized)`;
    }

    return {
      isApproved,
      creditLimit: limit,
      currentExposure: exposure,
      cartTotal,
      projectedExposure,
      remainingCredit,
      message,
      warningLevel,
    };
  },

  /**
   * Get draft exposure for a session (what the order would add to credit exposure)
   */
  async getDraftExposure(sessionId: number): Promise<{
    draftExposure: number;
    sampleValue: number;
    totalCartValue: number;
  }> {
    const cart = await sessionCartService.getCart(sessionId);

    let draftExposure = 0;
    let sampleValue = 0;

    for (const item of cart.items) {
      const lineTotal =
        parseFloat(item.quantity.toString()) *
        parseFloat(item.unitPrice.toString());

      if (item.isSample) {
        sampleValue += lineTotal;
      } else {
        draftExposure += lineTotal;
      }
    }

    return {
      draftExposure,
      sampleValue,
      totalCartValue: draftExposure + sampleValue,
    };
  },
};
