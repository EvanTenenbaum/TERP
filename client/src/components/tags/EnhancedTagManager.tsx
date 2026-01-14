/**
 * FEAT-002: Enhanced Tag Manager Component
 *
 * Improved tag management with:
 * - Color-coded tag badges
 * - Category-based organization
 * - Better autocomplete suggestions
 * - Bulk tag operations
 */

import React, { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorTagBadge, type TagData, type TagCategory } from "./ColorTagBadge";

interface EnhancedTagManagerProps {
  /** Currently selected tags (can be tag IDs or tag objects) */
  value: (number | TagData)[];
  /** Callback when tags change */
  onChange: (tags: (number | TagData)[]) => void;
  /** All available tags for suggestions */
  availableTags?: TagData[];
  /** Allow creating new tags */
  allowCreate?: boolean;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show tag count */
  showCount?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Enable bulk selection mode */
  enableBulkMode?: boolean;
  /** Show category labels on tags */
  showCategories?: boolean;
  /** Filter by specific categories */
  categoryFilter?: TagCategory[];
}

export function EnhancedTagManager({
  value = [],
  onChange,
  availableTags = [],
  allowCreate = true,
  maxTags,
  placeholder = "Add tags...",
  disabled = false,
  showCount = false,
  compact = false,
  enableBulkMode = false,
  showCategories = false,
  categoryFilter,
}: EnhancedTagManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<(number | TagData)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to TagData objects
  const selectedTags = useMemo(() => {
    return value.map(v => {
      if (typeof v === "number") {
        return availableTags.find(t => t.id === v);
      }
      return v;
    }).filter((t): t is TagData => t !== undefined);
  }, [value, availableTags]);

  // Filter suggestions based on input and category filter
  const filteredTags = useMemo(() => {
    const searchLower = inputValue.toLowerCase().trim();
    const selectedIds = selectedTags.map(t => t.id);

    return availableTags
      .filter((tag) => !selectedIds.includes(tag.id))
      .filter((tag) => {
        // Apply category filter if specified
        if (categoryFilter && categoryFilter.length > 0) {
          return categoryFilter.includes(tag.category || "CUSTOM");
        }
        return true;
      })
      .filter((tag) => tag.name.toLowerCase().includes(searchLower))
      .sort((a, b) => {
        // Prioritize tags that start with the search term
        const aStarts = a.name.toLowerCase().startsWith(searchLower);
        const bStarts = b.name.toLowerCase().startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [availableTags, selectedTags, inputValue, categoryFilter]);

  // Group filtered tags by category
  const tagsByCategory = useMemo(() => {
    const grouped: Record<string, TagData[]> = {};
    filteredTags.forEach((tag) => {
      const category = tag.category || "CUSTOM";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tag);
    });
    return grouped;
  }, [filteredTags]);

  // Check if can add more tags
  const canAddMore = !maxTags || selectedTags.length < maxTags;

  // Add a tag
  const addTag = (tag: TagData) => {
    if (!selectedTags.find(t => t.id === tag.id) && canAddMore) {
      onChange([...value, tag]);
      setInputValue("");
    }
  };

  // Remove a tag
  const removeTag = (tag: TagData) => {
    onChange(value.filter((v) => {
      if (typeof v === "number") return v !== tag.id;
      return v.id !== tag.id;
    }));
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Bulk operations
  const handleBulkRemove = () => {
    const bulkIds = bulkSelection.map(v => typeof v === "number" ? v : v.id);
    onChange(value.filter((v) => {
      const id = typeof v === "number" ? v : v.id;
      return !bulkIds.includes(id);
    }));
    setBulkSelection([]);
    setBulkMode(false);
  };

  const toggleBulkSelection = (tag: TagData) => {
    const isSelected = bulkSelection.some(v => {
      if (typeof v === "number") return v === tag.id;
      return v.id === tag.id;
    });

    if (isSelected) {
      setBulkSelection(bulkSelection.filter(v => {
        if (typeof v === "number") return v !== tag.id;
        return v.id !== tag.id;
      }));
    } else {
      setBulkSelection([...bulkSelection, tag]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Tag Input Area */}
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[42px]",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-ring"
        )}
      >
        {/* Selected Tags */}
        {selectedTags.map((tag) => {
          const isInBulkSelection = bulkSelection.some(v => {
            if (typeof v === "number") return v === tag.id;
            return v.id === tag.id;
          });

          return (
            <div
              key={tag.id}
              className={cn(
                bulkMode && "cursor-pointer",
                bulkMode && isInBulkSelection && "ring-2 ring-primary rounded"
              )}
              onClick={() => bulkMode && toggleBulkSelection(tag)}
            >
              <ColorTagBadge
                tag={tag}
                onRemove={!disabled && !bulkMode ? () => removeTag(tag) : undefined}
                size={compact ? "sm" : "md"}
                showCategory={showCategories}
              />
            </div>
          );
        })}

        {/* Input */}
        {!disabled && canAddMore && !bulkMode && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={selectedTags.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search tags..."
                  value={inputValue}
                  onValueChange={setInputValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {allowCreate && inputValue.trim() ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No tags found. Create a new tag in Settings.
                      </div>
                    ) : (
                      "No tags found."
                    )}
                  </CommandEmpty>
                  {Object.entries(tagsByCategory).map(([category, tags], idx) => (
                    <React.Fragment key={category}>
                      {idx > 0 && <CommandSeparator />}
                      <CommandGroup heading={category}>
                        <ScrollArea className="max-h-[200px]">
                          {tags.map((tag) => (
                            <CommandItem
                              key={tag.id}
                              value={tag.name}
                              onSelect={() => {
                                addTag(tag);
                                inputRef.current?.focus();
                              }}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <ColorTagBadge
                                tag={tag}
                                size="sm"
                                interactive={false}
                              />
                              {tag.description && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {tag.description}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </React.Fragment>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Footer with count and bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showCount && (
            <span className="text-xs text-muted-foreground">
              {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""}
              {maxTags && ` / ${maxTags} max`}
            </span>
          )}
        </div>

        {enableBulkMode && selectedTags.length > 0 && (
          <div className="flex items-center gap-2">
            {bulkMode ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {bulkSelection.length} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkRemove}
                  disabled={bulkSelection.length === 0}
                >
                  Remove Selected
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBulkMode(false);
                    setBulkSelection([]);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBulkMode(true)}
              >
                <Filter className="h-3 w-3 mr-1" />
                Bulk Edit
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedTagManager;
