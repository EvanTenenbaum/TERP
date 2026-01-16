/**
 * RTL (Right-to-Left) Utilities
 * Sprint 5.C.6: UX-013 - Fix Mirrored Elements Issue
 *
 * Provides utilities for handling LTR/RTL layouts and
 * preventing incorrectly mirrored elements.
 */

import { cn } from "@/lib/utils";

/**
 * Check if the current document direction is RTL
 */
export function isRTL(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.dir === "rtl" ||
    document.body.dir === "rtl" ||
    window.getComputedStyle(document.body).direction === "rtl"
  );
}

/**
 * Get the current text direction
 */
export function getDirection(): "ltr" | "rtl" {
  return isRTL() ? "rtl" : "ltr";
}

/**
 * CSS classes for elements that should NOT be mirrored in RTL
 * Use this for icons that have inherent directionality
 * (e.g., play button, forward/back arrows)
 */
export const noMirrorClass = "rtl:transform-none";

/**
 * CSS classes for elements that SHOULD be mirrored in RTL
 * Use this for directional icons (e.g., arrows)
 */
export const mirrorInRTLClass = "rtl:scale-x-[-1]";

/**
 * Get classes for a directional icon
 * @param shouldMirror - Whether the icon should be mirrored in RTL
 */
export function getDirectionalIconClasses(
  shouldMirror: boolean = true
): string {
  return shouldMirror ? mirrorInRTLClass : noMirrorClass;
}

/**
 * Icons that should NEVER be mirrored in RTL
 * These have universal meaning regardless of text direction
 */
export const neverMirrorIcons = new Set([
  "play",
  "pause",
  "stop",
  "volume",
  "volume-1",
  "volume-2",
  "volume-x",
  "mute",
  "music",
  "headphones",
  "mic",
  "video",
  "camera",
  "image",
  "sun",
  "moon",
  "star",
  "heart",
  "thumbs-up",
  "thumbs-down",
  "check",
  "x",
  "plus",
  "minus",
  "search",
  "settings",
  "home",
  "user",
  "users",
  "lock",
  "unlock",
  "eye",
  "eye-off",
  "bell",
  "calendar",
  "clock",
  "download",
  "upload",
  "cloud",
  "folder",
  "file",
  "trash",
  "edit",
  "copy",
  "save",
  "printer",
  "mail",
  "phone",
  "map-pin",
  "globe",
  "link",
  "external-link",
  "refresh",
  "loader",
  "alert",
  "info",
  "help",
  "shield",
  "credit-card",
  "dollar-sign",
  "package",
  "box",
  "truck",
  "shopping-cart",
  "tag",
  "bookmark",
  "flag",
  "filter",
  "sliders",
  "bar-chart",
  "pie-chart",
  "activity",
  "trending-up",
  "trending-down",
  "percent",
  "hash",
  "at-sign",
  "power",
  "wifi",
  "bluetooth",
  "battery",
  "zap",
]);

/**
 * Icons that SHOULD be mirrored in RTL
 * These have directional meaning (forward/back, next/prev)
 */
export const shouldMirrorIcons = new Set([
  "arrow-left",
  "arrow-right",
  "chevron-left",
  "chevron-right",
  "chevrons-left",
  "chevrons-right",
  "arrow-left-circle",
  "arrow-right-circle",
  "corner-down-left",
  "corner-down-right",
  "corner-up-left",
  "corner-up-right",
  "corner-left-down",
  "corner-left-up",
  "corner-right-down",
  "corner-right-up",
  "log-in",
  "log-out",
  "undo",
  "redo",
  "rotate-ccw",
  "rotate-cw",
  "skip-back",
  "skip-forward",
  "rewind",
  "fast-forward",
  "reply",
  "share",
  "move-left",
  "move-right",
  "panel-left",
  "panel-right",
  "sidebar",
  "layout-panel-left",
  "layout-panel-right",
  "indent",
  "outdent",
  "text-align-left",
  "text-align-right",
  "align-left",
  "align-right",
]);

/**
 * Check if an icon should be mirrored based on its name
 */
export function shouldIconBeMirrored(iconName: string): boolean {
  const normalizedName = iconName.toLowerCase().replace(/\s+/g, "-");
  if (neverMirrorIcons.has(normalizedName)) return false;
  if (shouldMirrorIcons.has(normalizedName)) return true;
  return false; // Default: don't mirror
}

/**
 * Get icon wrapper classes based on icon name
 */
export function getIconWrapperClasses(
  iconName: string,
  additionalClasses?: string
): string {
  const shouldMirror = shouldIconBeMirrored(iconName);
  return cn(shouldMirror ? mirrorInRTLClass : noMirrorClass, additionalClasses);
}

/**
 * Logical CSS properties for directional layouts
 * These automatically adapt to RTL without explicit mirroring
 */
export const logicalProperties = {
  // Use these instead of left/right
  start: "start", // 'left' in LTR, 'right' in RTL
  end: "end", // 'right' in LTR, 'left' in RTL

  // Margin/Padding
  marginStart: "ms", // Tailwind: ms-4 (margin-inline-start)
  marginEnd: "me", // Tailwind: me-4 (margin-inline-end)
  paddingStart: "ps", // Tailwind: ps-4 (padding-inline-start)
  paddingEnd: "pe", // Tailwind: pe-4 (padding-inline-end)

  // Text alignment
  textStart: "text-start",
  textEnd: "text-end",

  // Float
  floatStart: "float-start",
  floatEnd: "float-end",

  // Border
  borderStart: "border-s",
  borderEnd: "border-e",
  roundedStart: "rounded-s",
  roundedEnd: "rounded-e",
};

/**
 * Helper to get logical margin/padding classes
 */
export function getLogicalSpacing(
  type: "margin" | "padding",
  direction: "start" | "end" | "x",
  size: string | number
): string {
  const prefix = type === "margin" ? "m" : "p";

  if (direction === "x") {
    return `${prefix}x-${size}`;
  }

  const suffix = direction === "start" ? "s" : "e";
  return `${prefix}${suffix}-${size}`;
}

export default {
  isRTL,
  getDirection,
  noMirrorClass,
  mirrorInRTLClass,
  getDirectionalIconClasses,
  shouldIconBeMirrored,
  getIconWrapperClasses,
  logicalProperties,
  getLogicalSpacing,
};
