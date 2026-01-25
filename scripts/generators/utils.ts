/**
 * Shared utility functions for realistic data generation
 */

// ============================================================================
// Seeded Random Number Generator (Mulberry32)
// ============================================================================

let currentSeed = 12345;

/**
 * Initialize the seeded random number generator
 * Call this before generating data to ensure reproducibility
 */
export function setSeed(seed: number): void {
  currentSeed = seed;
}

/**
 * Get a seeded random number between 0 and 1 (like Math.random)
 * Uses Mulberry32 algorithm for deterministic results
 */
export function seededRandom(): number {
  // Mulberry32 PRNG
  let t = currentSeed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * Get random function - uses seeded random for reproducibility
 * This replaces all random() calls in the generators
 */
export function random(): number {
  return seededRandom();
}

// ============================================================================
// Core Utility Functions
// ============================================================================

/**
 * Generate random number in range [min, max]
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Add variance to a number (e.g., ±10%)
 */
export function addVariance(value: number, variancePercent: number): number {
  const variance = value * variancePercent;
  return value + (random() * 2 - 1) * variance;
}

/**
 * Generate random date between start and end
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + random() * (end.getTime() - start.getTime())
  );
}

/**
 * Weighted random selection from array
 * weights should sum to 1.0
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  const rand = random();
  let sum = 0;

  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (rand <= sum) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate realistic company name
 */
export function generateCompanyName(index: number): string {
  const prefixes = [
    "Green",
    "Emerald",
    "Golden",
    "Pacific",
    "Coastal",
    "Premium",
    "Elite",
    "Natural",
    "Pure",
    "Organic",
  ];
  const middles = [
    "Valley Collective",
    "Coast Dispensary",
    "Wellness",
    "Gardens",
    "Farms",
    "Leaf",
    "Herb",
    "Grove",
    "Harvest",
    "Cultivation",
  ];
  const suffixes = ["LLC", "Inc", "Co", "Corp", "", "", "", "", "", ""];

  const prefix = prefixes[index % prefixes.length];
  const middle = middles[Math.floor(index / prefixes.length) % middles.length];
  const suffix =
    suffixes[
      Math.floor(index / (prefixes.length * middles.length)) % suffixes.length
    ];

  return suffix ? `${prefix} ${middle} ${suffix}` : `${prefix} ${middle}`;
}

/**
 * California cities for realistic cannabis business addresses
 */
export const CA_CITIES = [
  "Los Angeles",
  "San Francisco",
  "San Diego",
  "Oakland",
  "Sacramento",
  "San Jose",
];

/**
 * Generate California-based address
 */
export function generateCaliforniaAddress(): string {
  const streetNumber = randomInRange(100, 9999);
  const streets = [
    "Main St",
    "Market St",
    "Broadway",
    "Mission St",
    "Valencia St",
    "Sunset Blvd",
    "Ocean Ave",
    "Park Ave",
    "First St",
    "Second St",
  ];
  const street = streets[Math.floor(random() * streets.length)];
  const city = CA_CITIES[Math.floor(random() * CA_CITIES.length)];
  const zipCode = randomInRange(90001, 95999);

  return `${streetNumber} ${street}, ${city}, CA ${zipCode}`;
}

/**
 * Generate realistic person name
 */
export function generatePersonName(index: number): string {
  const firstNames = [
    "James",
    "Mary",
    "John",
    "Patricia",
    "Robert",
    "Jennifer",
    "Michael",
    "Linda",
    "William",
    "Barbara",
    "David",
    "Elizabeth",
    "Richard",
    "Susan",
    "Joseph",
    "Jessica",
    "Thomas",
    "Sarah",
    "Charles",
    "Karen",
    "Christopher",
    "Nancy",
    "Daniel",
    "Lisa",
    "Matthew",
    "Betty",
    "Anthony",
    "Margaret",
    "Mark",
    "Sandra",
    "Donald",
    "Ashley",
  ];

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Perez",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Walker",
    "Young",
  ];

  const firstName = firstNames[index % firstNames.length];
  const lastName =
    lastNames[Math.floor(index / firstNames.length) % lastNames.length];

  return `${firstName} ${lastName}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) {
    return "$0.00";
  }
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/**
 * Calculate percentage
 */
export function calculatePercent(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Random choice from array
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Generate Pareto distribution weights (80/20 rule)
 * Top 20% of items get 80% of the weight
 */
export function generateParetoWeights(count: number): number[] {
  const weights: number[] = [];
  const top20Count = Math.ceil(count * 0.2);

  // Top 20% get weight of 12 (very popular)
  for (let i = 0; i < top20Count; i++) {
    weights.push(12);
  }

  // Next 30% get weight of 3 (moderately popular)
  const mid30Count = Math.ceil(count * 0.3);
  for (let i = 0; i < mid30Count; i++) {
    weights.push(3);
  }

  // Bottom 50% get weight of 1 (rarely ordered)
  const bottom50Count = count - top20Count - mid30Count;
  for (let i = 0; i < bottom50Count; i++) {
    weights.push(1);
  }

  // Shuffle to randomize which items are popular
  return shuffle(weights);
}

/**
 * Select weighted random index based on Pareto weights
 */
export function selectWeightedIndex(weights: number[]): number {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  const indices = weights.map((_, i) => i);
  return weightedRandom(indices, normalizedWeights);
}

/**
 * Generate long-tail distributed random number
 * Most values will be small, few will be large
 * Uses exponential distribution
 */
export function longTailRandom(min: number, max: number, skew = 2): number {
  // Generate exponentially distributed random number
  const rand = random();
  const exponential = Math.pow(rand, skew);
  const value = min + exponential * (max - min);
  return Math.round(value);
}

/**
 * Generate weighted random quantity for B2B orders
 * Most orders have small quantities, few have large quantities
 */
export function generateWeightedQuantity(isFlower: boolean): number {
  if (isFlower) {
    // Flower: 0.5 to 20 lbs, weighted toward 2-5 lbs
    const weights = [0.1, 0.7, 0.15, 0.05]; // [0.5-2, 2-5, 5-10, 10-20]
    const ranges = [
      [0.5, 2],
      [2, 5],
      [5, 10],
      [10, 20],
    ];
    const rangeIndex = weightedRandom([0, 1, 2, 3], weights);
    const [rangeMin, rangeMax] = ranges[rangeIndex];
    return parseFloat(
      (rangeMin + random() * (rangeMax - rangeMin)).toFixed(1)
    );
  } else {
    // Non-flower: 5 to 100 units, weighted toward 10-30 units
    const weights = [0.1, 0.6, 0.2, 0.1]; // [1-10, 10-30, 30-60, 60-100]
    const ranges = [
      [1, 10],
      [10, 30],
      [30, 60],
      [60, 100],
    ];
    const rangeIndex = weightedRandom([0, 1, 2, 3], weights);
    const [rangeMin, rangeMax] = ranges[rangeIndex];
    return Math.round(rangeMin + random() * (rangeMax - rangeMin));
  }
}
