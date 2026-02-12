/**
 * Strain Family Detection Utility
 * Identifies parent strains and links variants to families
 */

// Known strain family base names (from analysis of 12,804 strains)
const KNOWN_FAMILIES = [
  'OG', 'Kush', 'Haze', 'Dream', 'Diesel', 'Cookies', 'Gelato', 
  'Zkittlez', 'Sherbet', 'Runtz', 'Cake', 'Pie', 'Breath', 
  'Glue', 'Widow', 'Skunk', 'Cheese', 'Jack', 'Sour', 'Purple',
  'Blue', 'Green', 'White', 'Black', 'Pink', 'Red', 'Gold',
  'Berry', 'Cherry', 'Lemon', 'Lime', 'Orange', 'Grape', 'Mango',
  'Mint', 'Candy', 'Cream', 'Fire', 'Ice', 'Thunder', 'Lightning',
  'Dawg', 'Bud', 'Star', 'Wreck', 'Express', 'Tangie', 'Durban',
  'Afghani', 'Hindu', 'Northern', 'Lights', 'Train', 'Wreck'
];

/**
 * Extract potential base strain name from a strain name
 * Uses known families and heuristics
 */
export function extractBaseStrainName(strainName: string): string | null {
  if (!strainName || strainName.length < 2) return null;
  
  // Normalize: remove special characters, split into words
  const normalized = strainName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return null;
  
  // Strategy 1: Check if any word matches known families (case-insensitive)
  for (const word of words) {
    for (const family of KNOWN_FAMILIES) {
      if (word.toLowerCase() === family.toLowerCase()) {
        return family;
      }
    }
  }
  
  // Strategy 2: Check for partial matches with known families
  for (const word of words) {
    for (const family of KNOWN_FAMILIES) {
      if (word.toLowerCase().includes(family.toLowerCase()) && 
          word.length <= family.length + 2) {
        return family;
      }
    }
  }
  
  // Strategy 3: Use last word as base name (heuristic)
  // Only if it's at least 4 characters and not a common descriptor
  const lastWord = words[words.length - 1];
  const commonDescriptors = ['auto', 'fem', 'reg', 'cbd', 'thc', 'cut', 'clone'];
  
  if (words.length > 1 && 
      lastWord.length >= 4 && 
      !commonDescriptors.includes(lastWord.toLowerCase())) {
    return lastWord.charAt(0).toUpperCase() + lastWord.slice(1).toLowerCase();
  }
  
  return null;
}

/**
 * Calculate confidence score for base name extraction
 * Returns 0-100 score
 */
export function getExtractionConfidence(strainName: string, baseName: string | null): number {
  if (!baseName) return 0;
  
  const normalized = strainName.toLowerCase();
  const baseNormalized = baseName.toLowerCase();
  
  // High confidence if base name is in known families
  if (KNOWN_FAMILIES.some(f => f.toLowerCase() === baseNormalized)) {
    return 95;
  }
  
  // Medium confidence if it's the last word
  const words = normalized.split(/\s+/);
  if (words[words.length - 1] === baseNormalized) {
    return 75;
  }
  
  // Lower confidence if it's somewhere in the middle
  if (normalized.includes(baseNormalized)) {
    return 60;
  }
  
  return 50;
}

/**
 * Determine if a strain is likely a variant of another
 * Returns true if strainName appears to be a variant of baseName
 */
export function isLikelyVariant(strainName: string, baseName: string): boolean {
  const normalized = strainName.toLowerCase();
  const baseNormalized = baseName.toLowerCase();
  
  // Must contain the base name
  if (!normalized.includes(baseNormalized)) {
    return false;
  }
  
  // Must have additional words (not just the base name)
  const words = normalized.split(/\s+/);
  if (words.length === 1) {
    return false;
  }
  
  return true;
}

/**
 * Suggest parent strain name for a given strain
 * Returns null if no clear parent can be identified
 */
export function suggestParentStrain(strainName: string): {
  parentName: string;
  confidence: number;
} | null {
  const baseName = extractBaseStrainName(strainName);
  if (!baseName) return null;
  
  const confidence = getExtractionConfidence(strainName, baseName);
  
  // Only suggest if confidence is above threshold
  if (confidence < 60) return null;
  
  return {
    parentName: baseName,
    confidence: confidence
  };
}

/**
 * Group strains by family
 * Takes an array of strains and returns them grouped by base name
 */
export function groupStrainsByFamily(strains: Array<{ id: number; name: string }>): Map<string, Array<{ id: number; name: string }>> {
  const families = new Map<string, Array<{ id: number; name: string }>>();
  
  for (const strain of strains) {
    const baseName = extractBaseStrainName(strain.name);
    if (baseName) {
      let family = families.get(baseName);
      if (!family) {
        family = [];
        families.set(baseName, family);
      }
      family.push(strain);
    }
  }
  
  return families;
}

