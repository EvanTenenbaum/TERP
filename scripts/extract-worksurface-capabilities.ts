/**
 * Capability Extraction Script
 *
 * Extracts every user-facing capability from a classic WorkSurface component:
 * - trpc mutations (things users can DO)
 * - trpc queries (things users can SEE)
 * - Button/action affordances (clickable UI elements)
 * - Route navigations (places users can GO)
 * - Dialog/confirmation gates (gated interactions)
 * - Keyboard shortcuts (interaction patterns)
 *
 * Usage:
 *   npx tsx scripts/extract-worksurface-capabilities.ts <path-to-component.tsx>
 *
 * Output: CSV to stdout, summary to stderr
 */

import { readFileSync } from "fs";
import { basename } from "path";

interface Capability {
  id: string;
  type:
    | "mutation"
    | "query"
    | "action"
    | "navigation"
    | "dialog"
    | "keyboard"
    | "export"
    | "import";
  name: string;
  source: string;
  detail: string;
  line: number;
}

function extractCapabilities(filePath: string): Capability[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const componentName = basename(filePath, ".tsx");
  const capabilities: Capability[] = [];
  let idCounter = 0;

  const addCapability = (
    type: Capability["type"],
    name: string,
    source: string,
    detail: string,
    line: number
  ) => {
    idCounter++;
    const prefix = type.toUpperCase().slice(0, 3);
    capabilities.push({
      id: `${prefix}-${String(idCounter).padStart(3, "0")}`,
      type,
      name,
      source,
      detail,
      line,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // trpc mutations: trpc.xxx.yyy.useMutation
    const mutationMatch = line.match(/trpc\.([a-zA-Z.]+)\.useMutation/);
    if (mutationMatch) {
      const route = mutationMatch[1];
      addCapability(
        "mutation",
        route,
        `trpc.${route}.useMutation`,
        `Mutation: ${route}`,
        lineNum
      );
    }

    // trpc queries: trpc.xxx.yyy.useQuery
    const queryMatch = line.match(/trpc\.([a-zA-Z.]+)\.useQuery/);
    if (queryMatch) {
      const route = queryMatch[1];
      addCapability(
        "query",
        route,
        `trpc.${route}.useQuery`,
        `Query: ${route}`,
        lineNum
      );
    }

    // trpc infinite queries: trpc.xxx.yyy.useInfiniteQuery
    const infiniteMatch = line.match(/trpc\.([a-zA-Z.]+)\.useInfiniteQuery/);
    if (infiniteMatch) {
      const route = infiniteMatch[1];
      addCapability(
        "query",
        `${route} (infinite)`,
        `trpc.${route}.useInfiniteQuery`,
        `Infinite query: ${route}`,
        lineNum
      );
    }

    // Buttons with onClick: <Button ... onClick={...}>Label</Button>
    // Look for Button components and try to extract their text content
    const buttonMatch = line.match(/<Button[^>]*>/);
    if (buttonMatch) {
      // Try to find the label on the same line or next few lines
      const buttonContext = lines
        .slice(i, Math.min(i + 5, lines.length))
        .join(" ");
      const labelMatch = buttonContext.match(/>([^<]+)<\/Button>/);
      const iconLabelMatch = buttonContext.match(
        /(?:className="[^"]*"\s*\/>)\s*([^<]+)<\/Button>/
      );
      const label =
        labelMatch?.[1]?.trim() ||
        iconLabelMatch?.[1]?.trim() ||
        "(icon button)";

      // Check if disabled
      const isDisabled = buttonContext.includes("disabled");
      const disabledDetail = isDisabled ? " (conditionally disabled)" : "";

      // Check variant
      const variantMatch = buttonContext.match(/variant="([^"]+)"/);
      const variant = variantMatch?.[1] || "default";

      if (label !== "(icon button)" || buttonContext.includes("onClick")) {
        addCapability(
          "action",
          label
            .replace(/\{[^}]*\}/g, "...")
            .replace(/\s+/g, " ")
            .slice(0, 60),
          componentName,
          `Button (${variant})${disabledDetail}`,
          lineNum
        );
      }
    }

    // Route navigations: setLocation(...)
    const navMatch = line.match(/setLocation\s*\(\s*[`"']([^`"']+)[`"']/);
    if (navMatch) {
      addCapability(
        "navigation",
        navMatch[1],
        componentName,
        `Route navigation`,
        lineNum
      );
    }

    // Route navigations via builder functions
    const builderNavMatch = line.match(
      /setLocation\s*\(\s*(build\w+Path|`[^`]+`)/
    );
    if (builderNavMatch && !navMatch) {
      addCapability(
        "navigation",
        builderNavMatch[1],
        componentName,
        `Route navigation (builder)`,
        lineNum
      );
    }

    // window.open
    const windowOpenMatch = line.match(/window\.open\s*\(\s*[`"']([^`"']+)/);
    if (windowOpenMatch) {
      addCapability(
        "navigation",
        windowOpenMatch[1],
        componentName,
        `External navigation`,
        lineNum
      );
    }

    // Confirm dialogs
    const confirmMatch = line.match(/<ConfirmDialog|<AlertDialog|confirm\s*\(/);
    if (confirmMatch) {
      const dialogContext = lines
        .slice(i, Math.min(i + 10, lines.length))
        .join(" ");
      const titleMatch = dialogContext.match(/title="([^"]+)"/);
      const title = titleMatch?.[1] || "Confirmation dialog";
      addCapability(
        "dialog",
        title,
        componentName,
        `Confirmation gate`,
        lineNum
      );
    }

    // Toast notifications (for understanding feedback patterns)
    const toastMatch = line.match(
      /toast\.(success|error|warning|info)\s*\(\s*[`"']([^`"']+)/
    );
    if (toastMatch) {
      // Don't add as capability — these are feedback, not user actions
    }

    // Keyboard shortcuts: useWorkSurfaceKeyboard, onKeyDown, hotkeys
    const kbdMatch = line.match(
      /(?:key|hotkey|shortcut)\s*(?:===?|:)\s*["']([^"']+)["']/i
    );
    if (kbdMatch) {
      addCapability(
        "keyboard",
        kbdMatch[1],
        componentName,
        `Keyboard shortcut`,
        lineNum
      );
    }

    // useWorkSurfaceKeyboard
    if (line.includes("useWorkSurfaceKeyboard")) {
      addCapability(
        "keyboard",
        "WorkSurface keyboard contract",
        componentName,
        `Keyboard navigation hook`,
        lineNum
      );
    }

    // Export/download functionality
    const exportMatch = line.match(
      /(?:export|download|generatePDF|print)\s*(?:To|As|Data|CSV|PDF|Report)?/i
    );
    if (
      exportMatch &&
      (line.includes("onClick") ||
        line.includes("function") ||
        line.includes("=>"))
    ) {
      addCapability(
        "export",
        exportMatch[0].trim(),
        componentName,
        `Export/download action`,
        lineNum
      );
    }

    // useExport hook
    if (line.includes("useExport")) {
      addCapability(
        "export",
        "Export hook",
        componentName,
        `Export functionality via useExport`,
        lineNum
      );
    }

    // Select/dropdown filters (important for understanding browsing capabilities)
    const selectMatch = line.match(/<Select[^>]*>/);
    if (selectMatch) {
      const selectContext = lines
        .slice(i, Math.min(i + 8, lines.length))
        .join(" ");
      const placeholderMatch = selectContext.match(/placeholder="([^"]+)"/);
      if (placeholderMatch) {
        addCapability(
          "action",
          `Filter: ${placeholderMatch[1]}`,
          componentName,
          `Select filter`,
          lineNum
        );
      }
    }

    // Search inputs
    if (
      line.includes('placeholder="Search') ||
      line.includes('placeholder="Filter')
    ) {
      const searchMatch = line.match(/placeholder="([^"]+)"/);
      if (searchMatch) {
        addCapability(
          "action",
          searchMatch[1],
          componentName,
          `Search/filter input`,
          lineNum
        );
      }
    }
  }

  // Deduplicate by type+name (keep first occurrence)
  const seen = new Set<string>();
  return capabilities.filter(cap => {
    const key = `${cap.type}:${cap.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toCSV(capabilities: Capability[], componentName: string): string {
  const header = "capability_id,type,name,source,detail,line,component";
  const rows = capabilities.map(cap =>
    [
      cap.id,
      cap.type,
      `"${cap.name.replace(/"/g, '""')}"`,
      `"${cap.source.replace(/"/g, '""')}"`,
      `"${cap.detail.replace(/"/g, '""')}"`,
      cap.line,
      componentName,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

// Main
const filePath = process.argv[2];
if (!filePath) {
  console.error(
    "Usage: npx tsx scripts/extract-worksurface-capabilities.ts <path-to-component.tsx>"
  );
  process.exit(1);
}

const componentName = basename(filePath, ".tsx");
const capabilities = extractCapabilities(filePath);

// Output CSV to stdout
// eslint-disable-next-line no-console
console.log(toCSV(capabilities, componentName));

// Summary to stderr
const byType = capabilities.reduce<Record<string, number>>((acc, cap) => {
  acc[cap.type] = (acc[cap.type] || 0) + 1;
  return acc;
}, {});

console.error(`\n=== ${componentName} Capability Extraction ===`);
console.error(`Total capabilities: ${capabilities.length}`);
Object.entries(byType)
  .sort(([, a], [, b]) => b - a)
  .forEach(([type, count]) => {
    console.error(`  ${type}: ${count}`);
  });
console.error("");
