import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GripVertical, RotateCcw, Search } from "lucide-react";

export interface GridColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

interface GridColumnsPopoverProps {
  columns: GridColumnOption[];
  onChange: (next: GridColumnOption[]) => void;
  onReset: () => void;
  triggerLabel?: string;
}

function reorder(
  items: GridColumnOption[],
  sourceId: string,
  targetId: string
): GridColumnOption[] {
  const sourceIndex = items.findIndex(c => c.id === sourceId);
  const targetIndex = items.findIndex(c => c.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function GridColumnsPopover({
  columns,
  onChange,
  onReset,
  triggerLabel = "Columns",
}: GridColumnsPopoverProps) {
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return columns;
    return columns.filter(c => c.label.toLowerCase().includes(term));
  }, [columns, search]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Columns</p>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search columns"
              className="pl-7 h-8"
            />
          </div>

          <div className="max-h-72 overflow-auto rounded border">
            {filtered.map(column => (
              <div
                key={column.id}
                draggable
                onDragStart={() => setDraggingId(column.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!draggingId || draggingId === column.id) return;
                  onChange(reorder(columns, draggingId, column.id));
                  setDraggingId(null);
                }}
                className="flex items-center gap-2 px-2 py-2 border-b last:border-b-0 bg-background"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={checked => {
                    onChange(
                      columns.map(c =>
                        c.id === column.id ? { ...c, visible: !!checked } : c
                      )
                    );
                  }}
                />
                <span className="text-sm">{column.label}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                No columns match search.
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Drag rows to reorder. Toggle to show/hide.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default GridColumnsPopover;
