/**
 * FEAT-002: Enhanced Tag Manager Component
 *
 * Provides improved tag management with:
 * - Better autocomplete suggestions
 * - Bulk tag operations
 * - Tag filtering and search
 * - Visual tag organization
 */

import React, { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label as _Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { X, Plus, Tag, Search, CheckCircle2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagManagerProps {
  /** Currently selected tags */
  value: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** All available tags for suggestions */
  availableTags?: string[];
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
}

export function TagManager({
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
}: TagManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const filteredTags = useMemo(() => {
    const searchLower = inputValue.toLowerCase().trim();
    return availableTags
      .filter((tag) => !value.includes(tag))
      .filter((tag) => tag.toLowerCase().includes(searchLower))
      .sort((a, b) => {
        // Prioritize tags that start with the search term
        const aStarts = a.toLowerCase().startsWith(searchLower);
        const bStarts = b.toLowerCase().startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });
  }, [availableTags, value, inputValue]);

  // Check if can add more tags
  const canAddMore = !maxTags || value.length < maxTags;

  // Add a tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && canAddMore) {
      onChange([...value, trimmedTag]);
      setInputValue("");
    }
  };

  // Remove a tag
  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Bulk operations
  const handleBulkAdd = () => {
    const newTags = bulkSelection.filter((t) => !value.includes(t));
    if (maxTags) {
      const availableSlots = maxTags - value.length;
      onChange([...value, ...newTags.slice(0, availableSlots)]);
    } else {
      onChange([...value, ...newTags]);
    }
    setBulkSelection([]);
    setBulkMode(false);
  };

  const handleBulkRemove = () => {
    onChange(value.filter((t) => !bulkSelection.includes(t)));
    setBulkSelection([]);
    setBulkMode(false);
  };

  const toggleBulkSelection = (tag: string) => {
    setBulkSelection((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-2">
      {/* Tag Input Area */}
      <div className={cn(
        "flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[42px]",
        disabled && "opacity-50 cursor-not-allowed",
        isOpen && "ring-2 ring-ring"
      )}>
        {/* Selected Tags */}
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={cn(
              "gap-1 text-sm",
              compact && "text-xs py-0",
              bulkMode && bulkSelection.includes(tag) && "ring-2 ring-primary"
            )}
            onClick={() => bulkMode && toggleBulkSelection(tag)}
          >
            <Tag className="h-3 w-3" />
            {tag}
            {!disabled && !bulkMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

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
                placeholder={value.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search tags..."
                  value={inputValue}
                  onValueChange={setInputValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {allowCreate && inputValue.trim() ? (
                      <button
                        className="flex items-center gap-2 w-full p-2 text-sm hover:bg-accent rounded cursor-pointer"
                        onClick={() => addTag(inputValue)}
                      >
                        <Plus className="h-4 w-4" />
                        Create "{inputValue}"
                      </button>
                    ) : (
                      "No tags found."
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Available Tags">
                    <ScrollArea className="h-[200px]">
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => {
                            addTag(tag);
                            inputRef.current?.focus();
                          }}
                          className="cursor-pointer"
                        >
                          <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                          {tag}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
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
              {value.length} tag{value.length !== 1 ? "s" : ""}
              {maxTags && ` / ${maxTags} max`}
            </span>
          )}
        </div>

        {enableBulkMode && value.length > 0 && (
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

/**
 * TagFilter Component
 * For filtering lists by tags
 */
interface TagFilterProps {
  /** All available tags */
  availableTags: string[];
  /** Currently selected filter tags */
  selectedTags: string[];
  /** Callback when filter changes */
  onFilterChange: (tags: string[]) => void;
  /** Filter mode: 'any' (OR) or 'all' (AND) */
  mode?: "any" | "all";
  /** Callback when mode changes */
  onModeChange?: (mode: "any" | "all") => void;
}

export function TagFilter({
  availableTags,
  selectedTags,
  onFilterChange,
  mode = "any",
  onModeChange,
}: TagFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTags = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return availableTags.filter((tag) =>
      tag.toLowerCase().includes(searchLower)
    );
  }, [availableTags, searchTerm]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onFilterChange(selectedTags.filter((t) => t !== tag));
    } else {
      onFilterChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tags..."
          className="pl-9"
        />
      </div>

      {/* Mode Toggle */}
      {onModeChange && selectedTags.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Match:</span>
          <Button
            type="button"
            variant={mode === "any" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("any")}
          >
            Any
          </Button>
          <Button
            type="button"
            variant={mode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("all")}
          >
            All
          </Button>
        </div>
      )}

      {/* Tag List */}
      <ScrollArea className="h-[200px]">
        <div className="space-y-1">
          {filteredTags.map((tag) => (
            <div
              key={tag}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                selectedTags.includes(tag) && "bg-accent"
              )}
              onClick={() => toggleTag(tag)}
            >
              <Checkbox checked={selectedTags.includes(tag)} />
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>{tag}</span>
            </div>
          ))}
          {filteredTags.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No tags found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selected Summary */}
      {selectedTags.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange([])}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * BulkTagOperations Component
 * For applying tags to multiple items at once
 */
interface BulkTagOperationsProps {
  /** Number of selected items */
  selectedCount: number;
  /** Available tags */
  availableTags: string[];
  /** Add tags to selected items */
  onAddTags: (tags: string[]) => void;
  /** Remove tags from selected items */
  onRemoveTags: (tags: string[]) => void;
  /** Whether operation is in progress */
  isLoading?: boolean;
}

export function BulkTagOperations({
  selectedCount,
  availableTags,
  onAddTags,
  onRemoveTags,
  isLoading = false,
}: BulkTagOperationsProps) {
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "remove">("add");

  const handleApply = () => {
    if (mode === "add" && tagsToAdd.length > 0) {
      onAddTags(tagsToAdd);
      setTagsToAdd([]);
    } else if (mode === "remove" && tagsToRemove.length > 0) {
      onRemoveTags(tagsToRemove);
      setTagsToRemove([]);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          Bulk Tag Operations ({selectedCount} items selected)
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "add" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("add")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tags
          </Button>
          <Button
            type="button"
            variant={mode === "remove" ? "destructive" : "outline"}
            size="sm"
            onClick={() => setMode("remove")}
          >
            <X className="h-4 w-4 mr-1" />
            Remove Tags
          </Button>
        </div>
      </div>

      <TagManager
        value={mode === "add" ? tagsToAdd : tagsToRemove}
        onChange={mode === "add" ? setTagsToAdd : setTagsToRemove}
        availableTags={availableTags}
        allowCreate={mode === "add"}
        placeholder={mode === "add" ? "Select tags to add..." : "Select tags to remove..."}
        showCount
      />

      <Button
        type="button"
        onClick={handleApply}
        disabled={
          isLoading ||
          (mode === "add" && tagsToAdd.length === 0) ||
          (mode === "remove" && tagsToRemove.length === 0)
        }
        className="w-full"
      >
        {isLoading
          ? "Applying..."
          : mode === "add"
          ? `Add ${tagsToAdd.length} Tag${tagsToAdd.length !== 1 ? "s" : ""} to ${selectedCount} Items`
          : `Remove ${tagsToRemove.length} Tag${tagsToRemove.length !== 1 ? "s" : ""} from ${selectedCount} Items`}
      </Button>
    </div>
  );
}

export default TagManager;
