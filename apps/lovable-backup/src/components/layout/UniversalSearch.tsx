import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { mockOrders, mockClients, mockVendors, mockInvoices } from "@/lib/mockData";

export function UniversalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-fast w-full max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span>Search orders, clients, invoices, vendors...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Orders">
            {mockOrders.slice(0, 5).map((order) => (
              <CommandItem
                key={order.id}
                onSelect={() => handleSelect(`/sales/orders/${order.id}`)}
              >
                {order.id} - {mockClients.find(c => c.id === order.client_id)?.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Clients">
            {mockClients.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => handleSelect(`/clients/${client.id}`)}
              >
                {client.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Vendors">
            {mockVendors.map((vendor) => (
              <CommandItem
                key={vendor.id}
                onSelect={() => handleSelect(`/vendors/${vendor.id}`)}
              >
                {vendor.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Invoices">
            {mockInvoices.map((invoice) => (
              <CommandItem
                key={invoice.id}
                onSelect={() => handleSelect(`/finance/invoices/${invoice.id}`)}
              >
                {invoice.id} - ${invoice.grand_total.toLocaleString()}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
