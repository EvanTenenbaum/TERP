import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import * as React from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StrainInputProps {
  value?: number | null; // strainId
  onChange: (strainId: number | null, strainName: string) => void;
  category?: "indica" | "sativa" | "hybrid" | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoAssignThreshold?: number; // Default: 95
}

interface StrainSuggestion {
  id: number;
  name: string;
  category: string | null;
  openthcId: string | null;
  similarity: number;
  matchType: "exact" | "partial" | "fuzzy";
}

/**
 * StrainInput Component
 * 
 * Intelligent strain selection with fuzzy matching and auto-assignment.
 * 
 * Features:
 * - Fuzzy search autocomplete
 * - Similarity scoring
 * - Auto-assignment for high similarity (≥95%)
 * - Suggestion confirmation for medium similarity (80-94%)
 * - Create new strain for low similarity (<80%)
 * - Visual indicators for match quality
 * 
 * @example
 * ```tsx
 * <StrainInput
 *   value={strainId}
 *   onChange={(id, name) => setStrainId(id)}
 *   category="hybrid"
 *   placeholder="Search for a strain..."
 * />
 * ```
 */
export function StrainInput({
  value,
  onChange,
  category,
  placeholder = "Search for a strain...",
  className,
  disabled = false,
  required = false,
  autoAssignThreshold = 95,
}: StrainInputProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStrain, setSelectedStrain] = React.useState<StrainSuggestion | null>(null);
  const [showSuggestion, setShowSuggestion] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<StrainSuggestion | null>(null);

  // Fetch selected strain details if value changes
  const { data: strainDetails } = trpc.strains.getById.useQuery(
    { id: value! },
    { enabled: !!value && !selectedStrain }
  );

  React.useEffect(() => {
    if (strainDetails && !selectedStrain) {
      setSelectedStrain({
        id: strainDetails.id,
        name: strainDetails.name,
        category: strainDetails.category,
        openthcId: strainDetails.openthcId || null,
        similarity: 100,
        matchType: "exact",
      });
    }
  }, [strainDetails, selectedStrain]);

  // Fuzzy search query
  const { data: searchResults, isLoading } = trpc.strains.fuzzySearch.useQuery(
    {
      query: searchQuery,
      limit: 10,
      category: category || undefined,
    },
    {
      enabled: searchQuery.length >= 2,
      keepPreviousData: true,
    }
  );

  // Create strain mutation
  const createStrainMutation = trpc.strains.create.useMutation({
    onSuccess: (newStrain) => {
      setSelectedStrain({
        id: newStrain.id,
        name: newStrain.name,
        category: newStrain.category,
        openthcId: null,
        similarity: 100,
        matchType: "exact",
      });
      onChange(newStrain.id, newStrain.name);
      setOpen(false);
      setShowSuggestion(false);
    },
  });

  // Handle strain selection
  const handleSelect = (strain: StrainSuggestion) => {
    // Check if similarity is high enough for auto-assignment
    if (strain.similarity >= autoAssignThreshold) {
      // Auto-assign
      setSelectedStrain(strain);
      onChange(strain.id, strain.name);
      setOpen(false);
      setShowSuggestion(false);
    } else if (strain.similarity >= 80) {
      // Show suggestion for confirmation
      setSuggestion(strain);
      setShowSuggestion(true);
    } else {
      // Low similarity, just select it
      setSelectedStrain(strain);
      onChange(strain.id, strain.name);
      setOpen(false);
      setShowSuggestion(false);
    }
  };

  // Handle suggestion confirmation
  const handleConfirmSuggestion = () => {
    if (suggestion) {
      setSelectedStrain(suggestion);
      onChange(suggestion.id, suggestion.name);
      setShowSuggestion(false);
      setOpen(false);
    }
  };

  // Handle create new strain
  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      createStrainMutation.mutate({
        name: searchQuery.trim(),
        category: category || null,
        standardizedName: searchQuery.toLowerCase().trim().replace(/\s+/g, "-"),
      });
    }
  };

  // Get similarity badge color
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 95) return "bg-green-500";
    if (similarity >= 80) return "bg-yellow-500";
    return "bg-gray-500";
  };

  // Get match type icon
  const getMatchIcon = (matchType: string, similarity: number) => {
    if (similarity >= 95) return <Check className="h-3 w-3" />;
    if (similarity >= 80) return <AlertCircle className="h-3 w-3" />;
    return null;
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-required={required}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !selectedStrain && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedStrain ? (
                <span className="flex items-center gap-2">
                  {selectedStrain.name}
                  {selectedStrain.category && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedStrain.category}
                    </Badge>
                  )}
                  {selectedStrain.openthcId && (
                    <Sparkles className="h-3 w-3 text-primary" title="OpenTHC verified" />
                  )}
                </span>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type strain name..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!isLoading && searchQuery.length < 2 && (
                <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
              )}
              {!isLoading && searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
                <div className="py-6 px-4 space-y-2">
                  <div className="text-sm text-muted-foreground text-center">
                    No strains found matching "{searchQuery}"
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleCreateNew}
                    disabled={createStrainMutation.isLoading}
                  >
                    {createStrainMutation.isLoading ? "Creating..." : `Create "${searchQuery}"`}
                  </Button>
                </div>
              )}
              {!isLoading && searchResults && searchResults.length > 0 && (
                <CommandGroup heading="Strains">
                  {searchResults.map((strain) => (
                    <CommandItem
                      key={strain.id}
                      value={strain.id.toString()}
                      onSelect={() => handleSelect(strain)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{strain.name}</span>
                            {strain.category && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {strain.category}
                              </Badge>
                            )}
                            {strain.openthcId && (
                              <Sparkles className="h-3 w-3 text-primary shrink-0" title="OpenTHC verified" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getSimilarityColor(strain.similarity),
                              "text-white border-0"
                            )}
                          >
                            {getMatchIcon(strain.matchType, strain.similarity)}
                            <span className="ml-1">{strain.similarity}%</span>
                          </Badge>
                          {selectedStrain?.id === strain.id && (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  {searchResults.length > 0 && (
                    <div className="px-2 py-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={handleCreateNew}
                        disabled={createStrainMutation.isLoading}
                      >
                        {createStrainMutation.isLoading ? "Creating..." : `Create new: "${searchQuery}"`}
                      </Button>
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Suggestion Alert */}
      {showSuggestion && suggestion && (
        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">Did you mean "{suggestion.name}"?</p>
              <p className="text-xs text-muted-foreground mt-1">
                {suggestion.similarity}% match - Click to use this strain
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSuggestion(false)}
              >
                No
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSuggestion}
              >
                Yes, use it
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-assignment indicator */}
      {selectedStrain && selectedStrain.similarity < 100 && selectedStrain.similarity >= autoAssignThreshold && (
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
          <Check className="h-3 w-3 text-green-500" />
          Auto-assigned based on {selectedStrain.similarity}% similarity
        </div>
      )}
    </div>
  );
}

