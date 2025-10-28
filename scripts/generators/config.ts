/**
 * Business parameters for realistic data generation
 * Based on user requirements
 */

export const CONFIG = {
  // Time period
  startDate: new Date(2024, 0, 1), // Jan 1, 2024
  endDate: new Date(2025, 9, 27),  // Oct 27, 2025
  totalMonths: 22,
  
  // Revenue targets
  monthlyRevenue: 2_000_000,
  totalRevenue: 44_000_000, // 22 months × $2M
  
  // Client distribution
  totalClients: 60,
  whaleClients: 10,
  regularClients: 50,
  whaleRevenuePercent: 0.70, // Whales = 70% of revenue
  regularRevenuePercent: 0.30, // Regular = 30% of revenue
  
  // Vendor distribution
  totalVendors: 8,
  
  // Product mix
  flowerPercent: 0.90, // 90% flower
  nonFlowerPercent: 0.10, // 10% other
  
  // Pricing (per pound for flower)
  indoorPrice: 1800,
  indoorPercentage: 0.40, // 40% of flower is indoor
  greenhousePrice: 1200,
  greenhousePercentage: 0.35, // 35% of flower is greenhouse
  outdoorPrice: 800,
  outdoorPercentage: 0.25, // 25% of flower is outdoor
  
  // Consignment rates
  salesConsignmentRate: 0.50, // 50% of sales on consignment
  intakeConsignmentRate: 0.90, // 90% of intake on consignment
  
  // Returns and refunds
  returnRate: 0.005, // 0.5% return rate
  refundRate: 0.05, // 5% of orders get refunds
  refundAmount: 0.05, // 5% refund amount
  
  // AR aging
  overduePercent: 0.15, // 15% of debt overdue
  overdue120PlusPercent: 0.50, // 50% of overdue debt is 120+ days
  
  // Margins
  averageMargin: 0.25, // 25% average margin
  marginVariance: 0.10, // ±10% variance
  
  // Order patterns
  ordersPerMonth: 200, // ~200 orders per month
  avgItemsPerOrder: 3, // Average 3 items per order
  
  // Strain data
  totalStrains: 50,
  
  // Lots and batches
  lotsPerMonth: 8,
  batchesPerLot: 1,
};

