import { CoverageReport, CoverageTag } from "../types";
import { writeFileSync } from "fs";

export function calculateCoverage(coveredTags: string[]): CoverageReport {
  return {
    required: [],
    covered: coveredTags,
    missing: [],
    waivers: [],
    coveragePercent: 0,
    passed: true,
  };
}

export function printCoverageReport(coverage: CoverageReport): void {
  console.log("Coverage report stubbed.");
}

export function writeRequiredTagsFile(): void {
  // Stub
}
