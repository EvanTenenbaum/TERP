/**
 * Credit Recommendations Engine
 * Generates actionable credit recommendations based on client credit analysis
 */

export interface CreditAnalysis {
  accountAgeDays: number;
  onTimePaymentRate: number; // 0-100
  utilizationPercentage: number; // 0-100
  hasOverdueInvoices: boolean;
  averagePaymentDays: number;
  ytdSpend: number;
  creditLimit: number;
  creditUsage: number;
  availableCredit: number;
}

export interface CreditRecommendations {
  canIncreaseLimit: boolean;
  limitIncreaseTier: 'strong' | 'good' | 'needs_improvement' | null;
  utilizationStatus: 'excellent' | 'good' | 'high' | 'critical';
  recommendations: string[];
  utilizationColor: 'green' | 'blue' | 'orange' | 'red';
  utilizationMessage: string;
}

/**
 * Phrase Library
 * Pre-built phrases for different credit situations
 */
const PHRASES = {
  // Credit Limit Increase
  limitIncrease: {
    strong: [
      "You're a strong candidate for a credit limit increase based on your excellent payment history.",
      "Your consistent on-time payments and account history qualify you for a higher credit limit.",
      "Contact us to discuss increasing your credit limit to support your growing business needs.",
    ],
    good: [
      "Based on your payment history and credit usage, you may qualify for a credit limit increase.",
      "Your account is in good standing. Reach out to discuss expanding your credit line.",
      "You're using your credit effectively. Let's talk about increasing your limit.",
    ],
  },
  
  // Improvement Areas
  improvement: {
    accountAge: [
      "Build your account history by maintaining consistent payment patterns for at least 90 days.",
      "Continue making on-time payments to establish a strong credit history with us.",
    ],
    paymentHistory: [
      "Improve your on-time payment rate to 80% or higher to qualify for a credit increase.",
      "Make your next 5 payments on time to strengthen your credit profile.",
    ],
    lowUtilization: [
      "Increase your credit usage above 60% to demonstrate need for a higher credit limit.",
      "Your current credit limit appears sufficient for your needs. Use more credit to qualify for an increase.",
    ],
    overdueInvoices: [
      "Clear all overdue invoices to become eligible for a credit limit increase.",
      "Bring your account current by paying overdue invoices to improve your credit standing.",
    ],
  },
  
  // Utilization Status
  utilization: {
    excellent: {
      message: "Your credit utilization is healthy. You have plenty of available credit.",
      recommendations: [
        "Your credit utilization is excellent. Keep up the good work!",
        "You're managing your credit responsibly.",
      ],
    },
    good: {
      message: "Your credit utilization is moderate. Consider paying down your balance to improve your credit status.",
      recommendations: [
        "Consider paying down your balance to maintain optimal credit health.",
        "Your utilization is in a good range. Keep monitoring your balance.",
      ],
    },
    high: {
      message: "Your credit utilization is high. Reducing your balance will improve your credit standing.",
      recommendations: [
        "Make a payment to bring your utilization below 60%.",
        "Reduce your balance to improve your credit utilization to a healthier level.",
        "Consider paying down your balance to maintain optimal credit health.",
      ],
    },
    critical: {
      message: "Your credit utilization is at a critical level. Please make a payment soon to avoid service interruption.",
      recommendations: [
        "Your credit is nearly maxed out. Make a payment to avoid service interruption.",
        "Urgent: Pay down your balance to restore available credit.",
        "Contact us immediately if you need to discuss payment arrangements.",
      ],
    },
  },
  
  // Payment Consistency
  paymentConsistency: {
    poor: [
      "Set up automatic payments to ensure you never miss a due date.",
      "Pay invoices within terms (Net 30) to improve your payment consistency score.",
      "Contact us if you're having trouble making payments on time. We're here to help.",
    ],
    good: [
      "You're doing well! Make your next few payments on time to reach excellent status.",
      "Keep up the good payment habits to maintain and improve your credit standing.",
    ],
    excellent: [
      "Excellent payment history! You're a valued client.",
      "Your consistent on-time payments are appreciated and noted.",
    ],
  },
  
  // Account Building
  accountBuilding: [
    "Continue building your account history with consistent on-time payments.",
    "Your account is off to a great start. Keep it up for 90 days to unlock more benefits.",
    "Make your first 5 payments on time to establish a strong foundation.",
  ],
};

/**
 * Check if client is eligible for credit limit increase
 */
function checkCreditIncreaseEligibility(analysis: CreditAnalysis): {
  eligible: boolean;
  tier: 'strong' | 'good' | 'needs_improvement' | null;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Check all eligibility criteria
  const accountAgeOk = analysis.accountAgeDays >= 90;
  const paymentHistoryOk = analysis.onTimePaymentRate >= 80;
  const utilizationOk = analysis.utilizationPercentage >= 60;
  const noOverdueOk = !analysis.hasOverdueInvoices;
  
  // Track what needs improvement
  if (!accountAgeOk) reasons.push('accountAge');
  if (!paymentHistoryOk) reasons.push('paymentHistory');
  if (!utilizationOk) reasons.push('lowUtilization');
  if (!noOverdueOk) reasons.push('overdueInvoices');
  
  // All criteria must be met
  const eligible = accountAgeOk && paymentHistoryOk && utilizationOk && noOverdueOk;
  
  if (!eligible) {
    return { eligible: false, tier: 'needs_improvement', reasons };
  }
  
  // Determine tier for eligible clients
  const isStrong = analysis.onTimePaymentRate >= 90 || analysis.accountAgeDays >= 180;
  
  return {
    eligible: true,
    tier: isStrong ? 'strong' : 'good',
    reasons: [],
  };
}

/**
 * Determine utilization status
 */
function getUtilizationStatus(utilizationPercentage: number): {
  status: 'excellent' | 'good' | 'high' | 'critical';
  color: 'green' | 'blue' | 'orange' | 'red';
  message: string;
} {
  if (utilizationPercentage <= 30) {
    return {
      status: 'excellent',
      color: 'green',
      message: PHRASES.utilization.excellent.message,
    };
  } else if (utilizationPercentage <= 60) {
    return {
      status: 'good',
      color: 'blue',
      message: PHRASES.utilization.good.message,
    };
  } else if (utilizationPercentage <= 80) {
    return {
      status: 'high',
      color: 'orange',
      message: PHRASES.utilization.high.message,
    };
  } else {
    return {
      status: 'critical',
      color: 'red',
      message: PHRASES.utilization.critical.message,
    };
  }
}

/**
 * Generate credit recommendations based on analysis
 */
export function generateCreditRecommendations(analysis: CreditAnalysis): CreditRecommendations {
  const recommendations: string[] = [];
  
  // Check credit increase eligibility
  const { eligible, tier, reasons } = checkCreditIncreaseEligibility(analysis);
  
  // Add credit increase recommendation if eligible
  if (eligible && tier) {
    const phrases = tier === 'strong' ? PHRASES.limitIncrease.strong : PHRASES.limitIncrease.good;
    recommendations.push(phrases[0]); // Use first phrase from the tier
  }
  
  // Add improvement recommendations if not eligible
  if (!eligible && tier === 'needs_improvement') {
    reasons.forEach(reason => {
      const improvementPhrases = PHRASES.improvement[reason as keyof typeof PHRASES.improvement];
      if (improvementPhrases && improvementPhrases.length > 0) {
        recommendations.push(improvementPhrases[0]);
      }
    });
  }
  
  // Get utilization status
  const utilizationStatus = getUtilizationStatus(analysis.utilizationPercentage);
  
  // Add utilization recommendations
  const utilizationRecs = PHRASES.utilization[utilizationStatus.status].recommendations;
  if (utilizationRecs && utilizationRecs.length > 0) {
    // Add specific payment amount if utilization is high or critical
    if (utilizationStatus.status === 'high' || utilizationStatus.status === 'critical') {
      const targetUtilization = utilizationStatus.status === 'critical' ? 0.60 : 0.50;
      const targetBalance = analysis.creditLimit * targetUtilization;
      const paymentNeeded = Math.max(0, analysis.creditUsage - targetBalance);
      
      if (paymentNeeded > 0) {
        recommendations.push(
          `Make a payment of $${paymentNeeded.toLocaleString()} to bring your utilization to a healthier level.`
        );
      }
    } else {
      recommendations.push(utilizationRecs[0]);
    }
  }
  
  // Add payment consistency recommendation
  if (analysis.onTimePaymentRate < 80) {
    recommendations.push(PHRASES.paymentConsistency.poor[0]);
  } else if (analysis.onTimePaymentRate < 90) {
    recommendations.push(PHRASES.paymentConsistency.good[0]);
  } else {
    recommendations.push(PHRASES.paymentConsistency.excellent[0]);
  }
  
  // Add account building recommendation for new accounts
  if (analysis.accountAgeDays < 90) {
    recommendations.push(PHRASES.accountBuilding[0]);
  }
  
  // Limit to top 4 recommendations
  const topRecommendations = recommendations.slice(0, 4);
  
  return {
    canIncreaseLimit: eligible,
    limitIncreaseTier: tier,
    utilizationStatus: utilizationStatus.status,
    utilizationColor: utilizationStatus.color,
    utilizationMessage: utilizationStatus.message,
    recommendations: topRecommendations,
  };
}

/**
 * Calculate what-if scenario for payment
 */
export function calculatePaymentImpact(
  analysis: CreditAnalysis,
  paymentAmount: number
): {
  newBalance: number;
  newUtilization: number;
  newAvailableCredit: number;
  utilizationChange: string;
  statusChange: string | null;
} {
  const newBalance = Math.max(0, analysis.creditUsage - paymentAmount);
  const newUtilization = (newBalance / analysis.creditLimit) * 100;
  const newAvailableCredit = analysis.creditLimit - newBalance;
  
  const oldStatus = getUtilizationStatus(analysis.utilizationPercentage);
  const newStatus = getUtilizationStatus(newUtilization);
  
  const utilizationChange = `${analysis.utilizationPercentage.toFixed(1)}% → ${newUtilization.toFixed(1)}%`;
  const statusChange = oldStatus.status !== newStatus.status 
    ? `${oldStatus.status} → ${newStatus.status}` 
    : null;
  
  return {
    newBalance,
    newUtilization,
    newAvailableCredit,
    utilizationChange,
    statusChange,
  };
}
