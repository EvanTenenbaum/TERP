export interface ScenarioConfig {
  name: string;
  description: string;
  clients: number;
  whaleClients: number;
  regularClients: number;
  vendors: number;
  strains: number;
  orders: number;
  monthsOfData: number;
  totalRevenue: number;
  
  // Optional overrides for edge cases
  overduePercent?: number;
  overdue120PlusPercent?: number;
  returnRate?: number;
  refundRate?: number;
  randomAnomalies?: boolean;
  anomalyRate?: number;
  seed?: number; // For deterministic random generation
}

export const scenarios: Record<string, ScenarioConfig> = {
  light: {
    name: 'Light',
    description: 'Fast seed for integration tests (~30s)',
    clients: 10,
    whaleClients: 2,
    regularClients: 8,
    vendors: 2,
    strains: 10,
    orders: 50,
    monthsOfData: 1,
    totalRevenue: 2_000_000,
    seed: 12345, // Deterministic for reproducible tests
  },
  
  full: {
    name: 'Full',
    description: 'Complete dataset for E2E tests (~2min)',
    clients: 60,
    whaleClients: 10,
    regularClients: 50,
    vendors: 8,
    strains: 50,
    orders: 4_400,
    monthsOfData: 22,
    totalRevenue: 44_000_000,
    seed: 12345, // Deterministic for reproducible tests
  },
  
  edgeCases: {
    name: 'Edge Cases',
    description: 'Extreme scenarios for stress testing (~45s)',
    clients: 20,
    whaleClients: 20, // All whales (100% concentration risk)
    regularClients: 0,
    vendors: 2,
    strains: 10,
    orders: 100,
    monthsOfData: 3,
    totalRevenue: 6_000_000,
    overduePercent: 0.80, // 80% of invoices overdue (vs. normal 15%)
    overdue120PlusPercent: 0.90, // 90% of overdue is 120+ days (vs. normal 50%)
    returnRate: 0.10, // 10% return rate (vs. normal 0.5%)
    refundRate: 0.20, // 20% refund rate (vs. normal 5%)
    seed: 12345, // Deterministic for reproducible tests
  },
  
  chaos: {
    name: 'Chaos',
    description: 'Random anomalies for chaos testing (~60s)',
    clients: 30,
    whaleClients: 5,
    regularClients: 25,
    vendors: 4,
    strains: 20,
    orders: 200,
    monthsOfData: 6,
    totalRevenue: 12_000_000,
    randomAnomalies: true,
    anomalyRate: 0.10, // 10% of data has anomalies
    seed: Date.now(), // Non-deterministic for chaos testing
  },
};

export function getScenario(name: string): ScenarioConfig {
  const scenario = scenarios[name];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${name}. Available scenarios: ${Object.keys(scenarios).join(', ')}`);
  }
  return scenario;
}
