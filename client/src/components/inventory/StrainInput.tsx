import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrainInputProps {
  value: number | null;
  onChange: (strainId: number | null, strainName: string) => void;
  category?: "indica" | "sativa" | "hybrid" | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function StrainInput({
  value,
  onChange,
  category,
  placeholder = "Select strain...",
  className,
  disabled = false,
  required: _required = false,
}: StrainInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrain, setSelectedStrain] = useState<{
    id: number;
    name: string;
    category: string | null;
  } | null>(null);

  // Fuzzy search query (90% threshold for auto-assignment)
  const { data: searchResults, isLoading } = trpc.strains.fuzzySearch.useQuery(
    { 
      query: searchQuery, 
      limit: 20,
      // threshold removed - not supported by API
      // category removed - not supported by API
    },
    { enabled: searchQuery.length >= 2 }
  );

  // Load selected strain if value changes
  const { data: strainData } = trpc.strains.getById.useQuery(
    { id: value ?? 0 },
    { enabled: !!value && !selectedStrain }
  );

  useEffect(() => {
    if (strainData && !selectedStrain) {
      setSelectedStrain(strainData);
    }
  }, [strainData, selectedStrain]);

  // Handle strain selection
  const handleSelect = (strain: { id: number; name: string; category: string | null; similarity?: number }) => {
    // Silent auto-assignment for 90%+ similarity
    setSelectedStrain({ id: strain.id, name: strain.name, category: strain.category });
    onChange(strain.id, strain.name);
    setSearchQuery("");
    setOpen(false);
  };

  // Create strain mutation
  const createStrainMutation = trpc.strains.getOrCreate.useMutation();

  // Handle manual text input (create new strain)
  const handleCreateNew = async () => {
    const strainName = searchQuery.trim();
    if (strainName.length < 2) return;

    // Optimistically surface the typed strain name so UI can immediately reflect selection.
    setSelectedStrain({
      id: -1,
      name: strainName,
      category: category || null,
    });
    setOpen(false);

    // Create new strain via getOrCreate endpoint
    const result = await createStrainMutation.mutateAsync({
      name: strainName,
      category:
        (category as "indica" | "sativa" | "hybrid" | undefined) || undefined,
      autoAssignThreshold: 90, // 90% threshold
    });

    if (!result.strainId) return;
    setSelectedStrain({
      id: result.strainId,
      name: strainName,
      category: category || null,
    });
    onChange(result.strainId, strainName);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedStrain ? selectedStrain.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type strain name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && searchQuery.length >= 2 && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            
            {!isLoading &&
              searchQuery.length >= 2 &&
              searchResults?.items &&
              searchResults.items.length === 0 && (
                <CommandGroup>
                  <CommandItem
                    value="create-new-empty"
                    onSelect={() => {
                      void handleCreateNew();
                    }}
                  >
                    <span className="text-sm">Create new: "{searchQuery}"</span>
                  </CommandItem>
                </CommandGroup>
              )}

            {searchResults?.items && searchResults.items.length > 0 && (
              <CommandGroup>
                {searchResults.items.map((strain) => (
                  <CommandItem
                    key={strain.id}
                    value={strain.id.toString()}
                    onSelect={() => handleSelect(strain)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedStrain?.id === strain.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <span>{strain.name}</span>
                      {strain.category && (
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          ({strain.category})
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
                
                {/* Option to create new if no exact match */}
                {searchQuery.length >= 2 && 
                 !searchResults.items.find(s => s.name.toLowerCase() === searchQuery.toLowerCase()) && (
                  <CommandItem
                    value="create-new"
                    onSelect={() => {
                      void handleCreateNew();
                    }}
                    className="border-t"
                  >
                    <span className="text-sm">
                      Create new: "{searchQuery}"
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            )}

            {searchQuery.length < 2 && (
              <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
