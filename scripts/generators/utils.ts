/**
 * Shared utility functions for realistic data generation
 */

/**
 * Generate random number in range [min, max]
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Add variance to a number (e.g., ±10%)
 */
export function addVariance(value: number, variancePercent: number): number {
  const variance = value * variancePercent;
  return value + (Math.random() * 2 - 1) * variance;
}

/**
 * Generate random date between start and end
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

/**
 * Weighted random selection from array
 * weights should sum to 1.0
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  const random = Math.random();
  let sum = 0;

  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (random <= sum) {
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
    const j = Math.floor(Math.random() * (i + 1));
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
    "Pure",
    "Natural",
    "Premium",
    "Elite",
    "Prime",
    "Royal",
    "Golden",
    "Silver",
    "Diamond",
  ];
  const middles = [
    "Leaf",
    "Herb",
    "Garden",
    "Farm",
    "Valley",
    "Mountain",
    "Coast",
    "River",
    "Forest",
    "Field",
  ];
  const suffixes = [
    "Distributors",
    "Wholesale",
    "Supply",
    "Trading",
    "Group",
    "Partners",
    "Co",
    "LLC",
    "Inc",
    "Corp",
  ];

  const prefix = prefixes[index % prefixes.length];
  const middle = middles[Math.floor(index / prefixes.length) % middles.length];
  const suffix =
    suffixes[
      Math.floor(index / (prefixes.length * middles.length)) % suffixes.length
    ];

  return `${prefix} ${middle} ${suffix}`;
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
export function formatCurrency(amount: number): string {
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
  return array[Math.floor(Math.random() * array.length)];
}
