/**
 * PII Masking Utilities for Seeding Operations
 *
 * Anonymizes sensitive data in non-production environments for GDPR/CCPA compliance.
 * Uses Faker.js for generating realistic replacement data.
 */

import { faker } from "@faker-js/faker";
import { seedLogger } from "./logging";

// ============================================================================
// Type Definitions
// ============================================================================

export type PIIFieldType =
  | "email"
  | "phone"
  | "name"
  | "firstName"
  | "lastName"
  | "address"
  | "ssn"
  | "creditCard"
  | "dob"
  | "ip"
  | "unknown";

export interface MaskingConfig {
  environment: "production" | "staging" | "development" | "test";
  seed?: number;
  preserveFormat?: boolean;
  auditLogging?: boolean;
}

export interface MaskingResult {
  original: unknown;
  masked: unknown;
  fieldType: PIIFieldType;
  wasMasked: boolean;
}

export interface PIIFieldPattern {
  type: PIIFieldType;
  patterns: RegExp[];
}

// ============================================================================
// PII Field Detection Patterns
// ============================================================================

/**
 * Patterns for detecting PII fields by column/field name
 */
const PII_FIELD_PATTERNS: PIIFieldPattern[] = [
  {
    type: "email",
    patterns: [/email/i, /e_?mail/i, /contact_?email/i],
  },
  {
    type: "phone",
    patterns: [/phone/i, /mobile/i, /tel/i, /fax/i, /cell/i, /contact_?number/i],
  },
  {
    type: "firstName",
    patterns: [/first_?name/i, /given_?name/i, /fname/i],
  },
  {
    type: "lastName",
    patterns: [/last_?name/i, /surname/i, /family_?name/i, /lname/i],
  },
  {
    type: "name",
    patterns: [
      /^name$/i,
      /full_?name/i,
      /contact_?name/i,
      /customer_?name/i,
      /client_?name/i,
      /vendor_?name/i,
    ],
  },
  {
    type: "address",
    patterns: [
      /address/i,
      /street/i,
      /city/i,
      /state/i,
      /zip/i,
      /postal/i,
      /country/i,
      /location/i,
    ],
  },
  {
    type: "ssn",
    patterns: [/ssn/i, /social_?security/i, /tax_?id/i, /ein/i],
  },
  {
    type: "creditCard",
    patterns: [/credit_?card/i, /card_?number/i, /cc_?number/i, /payment_?card/i],
  },
  {
    type: "dob",
    patterns: [/dob/i, /date_?of_?birth/i, /birth_?date/i, /birthday/i],
  },
  {
    type: "ip",
    patterns: [/ip_?address/i, /client_?ip/i, /user_?ip/i],
  },
];

// ============================================================================
// PIIMasker Class
// ============================================================================

/**
 * PII Masking Utility for GDPR/CCPA Compliance
 *
 * Anonymizes sensitive data in non-production environments.
 * Uses Faker.js for generating realistic replacement data.
 *
 * @example
 * ```typescript
 * const masker = new PIIMasker({ environment: 'development', seed: 12345 });
 * const maskedClient = masker.maskRecord('clients', {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   phone: '555-1234',
 * });
 * ```
 */
export class PIIMasker {
  private config: Required<MaskingConfig>;
  private maskedFieldsAudit: Map<string, Set<string>> = new Map();

  constructor(config: Partial<MaskingConfig> = {}) {
    this.config = {
      environment: config.environment ?? this.detectEnvironment(),
      seed: config.seed ?? Date.now(),
      preserveFormat: config.preserveFormat ?? true,
      auditLogging: config.auditLogging ?? true,
    };

    // Set Faker seed for deterministic output
    faker.seed(this.config.seed);

    seedLogger.environment(this.config.environment, {
      masking: this.shouldMask(),
      seed: this.config.seed,
    });
  }

  // ---------------------------------------------------------------------------
  // Environment Detection
  // ---------------------------------------------------------------------------

  /**
   * Detect environment from NODE_ENV
   */
  private detectEnvironment(): MaskingConfig["environment"] {
    const env = process.env.NODE_ENV?.toLowerCase();

    switch (env) {
      case "production":
        return "production";
      case "staging":
        return "staging";
      case "test":
        return "test";
      default:
        return "development";
    }
  }

  /**
   * Check if masking should be applied
   */
  shouldMask(): boolean {
    // Never mask in production (use real data)
    return this.config.environment !== "production";
  }

  // ---------------------------------------------------------------------------
  // Field Type Detection
  // ---------------------------------------------------------------------------

  /**
   * Detect PII field type from field name
   */
  detectFieldType(fieldName: string): PIIFieldType {
    for (const { type, patterns } of PII_FIELD_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(fieldName)) {
          return type;
        }
      }
    }
    return "unknown";
  }

  /**
   * Check if a field is a PII field
   */
  isPIIField(fieldName: string): boolean {
    return this.detectFieldType(fieldName) !== "unknown";
  }

  // ---------------------------------------------------------------------------
  // Masking Methods
  // ---------------------------------------------------------------------------

  /**
   * Mask an email address
   */
  maskEmail(email: string): string {
    if (!this.shouldMask()) return email;

    // Generate deterministic fake email based on original
    faker.seed(this.hashString(email));
    return faker.internet.email().toLowerCase();
  }

  /**
   * Mask a phone number (preserves format)
   */
  maskPhone(phone: string): string {
    if (!this.shouldMask()) return phone;

    if (!this.config.preserveFormat) {
      faker.seed(this.hashString(phone));
      return faker.phone.number();
    }

    // Preserve format by replacing digits with random digits
    faker.seed(this.hashString(phone));
    return phone.replace(/\d/g, () => String(faker.number.int({ min: 0, max: 9 })));
  }

  /**
   * Mask a full name
   */
  maskName(name: string): string {
    if (!this.shouldMask()) return name;

    faker.seed(this.hashString(name));
    return faker.person.fullName();
  }

  /**
   * Mask a first name
   */
  maskFirstName(name: string): string {
    if (!this.shouldMask()) return name;

    faker.seed(this.hashString(name));
    return faker.person.firstName();
  }

  /**
   * Mask a last name
   */
  maskLastName(name: string): string {
    if (!this.shouldMask()) return name;

    faker.seed(this.hashString(name));
    return faker.person.lastName();
  }

  /**
   * Mask an address
   */
  maskAddress(address: string): string {
    if (!this.shouldMask()) return address;

    faker.seed(this.hashString(address));
    return faker.location.streetAddress({ useFullAddress: true });
  }

  /**
   * Mask a Social Security Number
   */
  maskSSN(ssn: string): string {
    if (!this.shouldMask()) return ssn;

    // Generate deterministic fake SSN
    faker.seed(this.hashString(ssn));
    const area = faker.number.int({ min: 100, max: 999 });
    const group = faker.number.int({ min: 10, max: 99 });
    const serial = faker.number.int({ min: 1000, max: 9999 });

    // Preserve format if original has dashes
    if (ssn.includes("-")) {
      return `${area}-${group}-${serial}`;
    }
    return `${area}${group}${serial}`;
  }

  /**
   * Mask a credit card number
   */
  maskCreditCard(cardNumber: string): string {
    if (!this.shouldMask()) return cardNumber;

    // Replace all but last 4 digits with X
    const cleaned = cardNumber.replace(/\D/g, "");
    const lastFour = cleaned.slice(-4);
    const masked = "XXXX-XXXX-XXXX-" + lastFour;
    return masked;
  }

  /**
   * Mask a date of birth
   */
  maskDOB(dob: Date | string): Date | string {
    if (!this.shouldMask()) return dob;

    const originalDate = dob instanceof Date ? dob : new Date(dob);
    faker.seed(this.hashString(originalDate.toISOString()));

    // Generate random date within ±10 years of original
    const year = originalDate.getFullYear() + faker.number.int({ min: -10, max: 10 });
    const month = faker.number.int({ min: 0, max: 11 });
    const day = faker.number.int({ min: 1, max: 28 });

    const maskedDate = new Date(year, month, day);
    return dob instanceof Date ? maskedDate : maskedDate.toISOString().split("T")[0];
  }

  /**
   * Mask an IP address
   */
  maskIP(ip: string): string {
    if (!this.shouldMask()) return ip;

    faker.seed(this.hashString(ip));

    // Check if IPv6
    if (ip.includes(":")) {
      return faker.internet.ipv6();
    }

    return faker.internet.ipv4();
  }

  /**
   * Auto-detect field type and mask accordingly
   */
  maskField(fieldName: string, value: unknown): MaskingResult {
    const fieldType = this.detectFieldType(fieldName);
    const shouldMask = this.shouldMask() && fieldType !== "unknown";

    if (!shouldMask || value === null || value === undefined) {
      return {
        original: value,
        masked: value,
        fieldType,
        wasMasked: false,
      };
    }

    let masked: unknown;

    switch (fieldType) {
      case "email":
        masked = typeof value === "string" ? this.maskEmail(value) : value;
        break;
      case "phone":
        masked = typeof value === "string" ? this.maskPhone(value) : value;
        break;
      case "name":
        masked = typeof value === "string" ? this.maskName(value) : value;
        break;
      case "firstName":
        masked = typeof value === "string" ? this.maskFirstName(value) : value;
        break;
      case "lastName":
        masked = typeof value === "string" ? this.maskLastName(value) : value;
        break;
      case "address":
        masked = typeof value === "string" ? this.maskAddress(value) : value;
        break;
      case "ssn":
        masked = typeof value === "string" ? this.maskSSN(value) : value;
        break;
      case "creditCard":
        masked = typeof value === "string" ? this.maskCreditCard(value) : value;
        break;
      case "dob":
        masked = this.maskDOB(value as Date | string);
        break;
      case "ip":
        masked = typeof value === "string" ? this.maskIP(value) : value;
        break;
      default:
        masked = value;
    }

    return {
      original: value,
      masked,
      fieldType,
      wasMasked: true,
    };
  }

  /**
   * Mask all PII fields in a record
   */
  maskRecord(
    tableName: string,
    record: Record<string, unknown>
  ): Record<string, unknown> {
    if (!this.shouldMask()) {
      seedLogger.piiMaskingSkipped("Production environment - no masking applied");
      return record;
    }

    const masked: Record<string, unknown> = {};
    const maskedFields: string[] = [];

    for (const [fieldName, value] of Object.entries(record)) {
      const result = this.maskField(fieldName, value);
      masked[fieldName] = result.masked;

      if (result.wasMasked && this.config.auditLogging) {
        maskedFields.push(fieldName);
        seedLogger.piiMasked(tableName, fieldName);

        // Track for audit
        let auditSet = this.maskedFieldsAudit.get(tableName);
        if (!auditSet) {
          auditSet = new Set();
          this.maskedFieldsAudit.set(tableName, auditSet);
        }
        auditSet.add(fieldName);
      }
    }

    if (maskedFields.length > 0) {
      seedLogger.piiMaskingSummary(tableName, maskedFields, this.config.environment);
    }

    return masked;
  }

  /**
   * Mask all records in a batch
   */
  maskBatch(
    tableName: string,
    records: Array<Record<string, unknown>>
  ): Array<Record<string, unknown>> {
    return records.map((record) => this.maskRecord(tableName, record));
  }

  // ---------------------------------------------------------------------------
  // Audit Methods
  // ---------------------------------------------------------------------------

  /**
   * Get audit summary of masked fields
   */
  getAuditSummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};

    for (const [table, fields] of this.maskedFieldsAudit.entries()) {
      summary[table] = Array.from(fields);
    }

    return summary;
  }

  /**
   * Clear audit log
   */
  clearAudit(): void {
    this.maskedFieldsAudit.clear();
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Generate deterministic hash from string for seeding
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Reset Faker seed
   */
  resetSeed(seed?: number): void {
    this.config.seed = seed ?? Date.now();
    faker.seed(this.config.seed);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a masker for the current environment
 */
export function createMasker(options?: Partial<MaskingConfig>): PIIMasker {
  return new PIIMasker(options);
}

/**
 * Quick mask function for single records
 */
export function maskRecord(
  tableName: string,
  record: Record<string, unknown>,
  options?: Partial<MaskingConfig>
): Record<string, unknown> {
  const masker = new PIIMasker(options);
  return masker.maskRecord(tableName, record);
}

/**
 * Check if a field name appears to be PII
 */
export function isPIIFieldName(fieldName: string): boolean {
  for (const { patterns } of PII_FIELD_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(fieldName)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get list of PII field types
 */
export function getPIIFieldTypes(): PIIFieldType[] {
  return PII_FIELD_PATTERNS.map((p) => p.type);
}

// ============================================================================
// Exports
// ============================================================================

export default PIIMasker;
