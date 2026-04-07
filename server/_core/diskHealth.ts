export type DiskHealthStatus = "ok" | "warning" | "critical";

export interface DiskUsageSnapshot {
  status: DiskHealthStatus;
  totalMb: number;
  usedMb: number;
  availableMb: number;
  usedPercent: number;
}

const DISK_WARNING_PERCENT = 90;
const DISK_CRITICAL_PERCENT = 95;
const DISK_WARNING_AVAILABLE_MB = 512;
const DISK_CRITICAL_AVAILABLE_MB = 256;

export function classifyDiskUsage(input: {
  usedPercent: number;
  availableMb: number;
}): DiskHealthStatus {
  if (
    input.usedPercent >= DISK_CRITICAL_PERCENT ||
    input.availableMb <= DISK_CRITICAL_AVAILABLE_MB
  ) {
    return "critical";
  }

  if (
    input.usedPercent >= DISK_WARNING_PERCENT ||
    input.availableMb <= DISK_WARNING_AVAILABLE_MB
  ) {
    return "warning";
  }

  return "ok";
}

function parseMegabytes(value: string): number | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized.endsWith("M")) {
    return null;
  }

  const parsed = Number.parseInt(normalized.slice(0, -1), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDfDiskUsageOutput(
  output: string
): DiskUsageSnapshot | null {
  const lines = output
    .trim()
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const columns = lines[1].split(/\s+/);
  if (columns.length < 6) {
    return null;
  }

  const [totalStr, usedStr, availableStr, percentStr] = columns.slice(-5, -1);
  const totalMb = parseMegabytes(totalStr);
  const usedMb = parseMegabytes(usedStr);
  const availableMb = parseMegabytes(availableStr);
  const usedPercent = Number.parseInt(percentStr.replace("%", ""), 10);

  if (
    totalMb === null ||
    usedMb === null ||
    availableMb === null ||
    !Number.isFinite(usedPercent)
  ) {
    return null;
  }

  return {
    status: classifyDiskUsage({ usedPercent, availableMb }),
    totalMb,
    usedMb,
    availableMb,
    usedPercent,
  };
}
