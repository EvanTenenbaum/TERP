/**
 * FEAT-002: Color-Coded Tag Badge Component
 *
 * Displays a tag with color-coding based on its category and custom color
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagCategory = "STATUS" | "PRIORITY" | "TYPE" | "CUSTOM" | "STRAIN" | "FLAVOR" | "EFFECT";

export interface TagData {
  id: number;
  name: string;
  color?: string;
  category?: TagCategory;
  description?: string;
}

interface ColorTagBadgeProps {
  tag: TagData | string;
  onRemove?: () => void;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  showCategory?: boolean;
  interactive?: boolean;
}

/**
 * Get color based on tag data
 */
function getTagColor(tag: TagData | string): string {
  if (typeof tag === "string") {
    return "#6B7280"; // Default gray
  }

  return tag.color || "#6B7280";
}

/**
 * Convert hex color to RGB for opacity support
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Check if color is dark (for text contrast)
 */
function isColorDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

export function ColorTagBadge({
  tag,
  onRemove,
  variant = "default",
  size = "md",
  className,
  showCategory = false,
  interactive = false,
}: ColorTagBadgeProps) {
  const tagName = typeof tag === "string" ? tag : tag.name;
  const tagColor = getTagColor(tag);
  const isDark = isColorDark(tagColor);
  const rgb = hexToRgb(tagColor);

  const sizeClasses = {
    sm: "text-xs py-0 px-2 h-5",
    md: "text-sm py-0.5 px-2.5 h-6",
    lg: "text-base py-1 px-3 h-7",
  };

  // Background and text colors
  const bgColor = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
    : "rgba(107, 114, 128, 0.15)";
  const borderColor = tagColor;
  const textColor = tagColor;

  const category = typeof tag !== "string" ? tag.category : undefined;

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1 font-medium border transition-all",
        sizeClasses[size],
        interactive && "cursor-pointer hover:scale-105",
        className
      )}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor,
      }}
    >
      {showCategory && category && (
        <span className="text-[10px] opacity-70 uppercase font-bold mr-1">
          {category}
        </span>
      )}
      <span>{tagName}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${tagName} tag`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

/**
 * Tag category color presets
 */
export const TAG_CATEGORY_COLORS: Record<TagCategory, string> = {
  STATUS: "#22C55E",     // Green
  PRIORITY: "#F59E0B",   // Amber
  TYPE: "#3B82F6",       // Blue
  CUSTOM: "#6B7280",     // Gray
  STRAIN: "#8B5CF6",     // Purple
  FLAVOR: "#EC4899",     // Pink
  EFFECT: "#14B8A6",     // Teal
};

/**
 * Get default color for a category
 */
export function getCategoryColor(category: TagCategory): string {
  return TAG_CATEGORY_COLORS[category] || TAG_CATEGORY_COLORS.CUSTOM;
}
