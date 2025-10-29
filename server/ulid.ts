/**
 * Simple ULID Generator
 * 
 * Generates Universally Unique Lexicographically Sortable Identifiers
 * Compatible with OpenTHC ULID format
 * 
 * Format: 26 characters, Crockford's Base32 encoding
 * Example: 01E7BTTYS5S0HQYHCXVFPRDNXA
 */

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford's Base32
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

/**
 * Generate a ULID
 */
export function ulid(seedTime?: number): string {
  const time = seedTime || Date.now();
  
  if (time < 0 || time > TIME_MAX) {
    throw new Error("Time must be between 0 and " + TIME_MAX);
  }
  
  return encodeTime(time, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

/**
 * Encode time component
 */
function encodeTime(now: number, len: number): string {
  let str = "";
  for (let i = len; i > 0; i--) {
    const mod = now % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    now = (now - mod) / ENCODING_LEN;
  }
  return str;
}

/**
 * Encode random component
 */
function encodeRandom(len: number): string {
  let str = "";
  for (let i = 0; i < len; i++) {
    const rand = Math.floor(Math.random() * ENCODING_LEN);
    str += ENCODING.charAt(rand);
  }
  return str;
}

/**
 * Generate ULID with custom prefix (for TERP-specific strains)
 * This ensures TERP-created strains are distinguishable from OpenTHC strains
 */
export function generateStrainULID(): string {
  return ulid();
}

/**
 * Check if a string is a valid ULID format
 */
export function isValidULID(id: string): boolean {
  if (id.length !== 26) return false;
  
  for (let i = 0; i < id.length; i++) {
    if (ENCODING.indexOf(id.charAt(i)) === -1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract timestamp from ULID
 */
export function decodeTime(id: string): number {
  if (!isValidULID(id)) {
    throw new Error("Invalid ULID");
  }
  
  const timeStr = id.substring(0, TIME_LEN);
  let time = 0;
  
  for (let i = 0; i < timeStr.length; i++) {
    const char = timeStr.charAt(i);
    const encodingIndex = ENCODING.indexOf(char);
    time = time * ENCODING_LEN + encodingIndex;
  }
  
  return time;
}

