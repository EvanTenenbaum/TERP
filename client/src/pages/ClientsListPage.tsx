import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AddClientWizard } from "@/components/clients/AddClientWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Eye, Edit, FileText, DollarSign, MessageSquare, Archive, Save, Star, Check, X, AlertTriangle } from "lucide-react";
import { DataCardSection } from "@/components/data-cards";

export default function ClientsListPage() {
  const [, setLocation] = useLocation();
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<React.ElementRef<'input'>>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Saved filter views
  type FilterView = {
    id: string;
    name: string;
    search: string;
    clientTypes: ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
    hasDebt?: boolean;
  };
  
  const defaultViews: FilterView[] = [
    { id: 'all', name: 'All Clients', search: '', clientTypes: [], hasDebt: undefined },
    { id: 'debt', name: 'Clients with Debt', search: '', clientTypes: [], hasDebt: true },
    { id: 'buyers', name: 'Buyers Only', search: '', clientTypes: ['buyer'], hasDebt: undefined },
    { id: 'sellers', name: 'Suppliers', search: '', clientTypes: ['seller'], hasDebt: undefined },
  ];
  
  const [savedViews, setSavedViews] = useState<FilterView[]>(() => {
    const saved = localStorage.getItem('client-filter-views');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  
  // Inline editing state
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({ name: '', email: '', phone: '' });
  
  // Update client mutation
  const utils = trpc.useContext();
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      utils.clients.count.invalidate();
      setEditingClientId(null);
    },
  });
  
  // Initialize filters from URL parameters
  const getInitialHasDebt = () => {
    const params = new URLSearchParams(window.location.search);
    const debtParam = params.get('hasDebt');
    if (debtParam === 'true') return true;
    if (debtParam === 'false') return false;
    return undefined;
  };
  
  const getInitialClientTypes = () => {
    const params = new URLSearchParams(window.location.search);
    const typesParam = params.get('clientTypes');
    if (typesParam) {
      return typesParam.split(',') as ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
    }
    return [];
  };
  
  // Filters and search state
  const [search, setSearch] = useState("");
  const [clientTypes, setClientTypes] = useState<("buyer" | "seller" | "brand" | "referee" | "contractor")[]>(getInitialClientTypes);
  const [hasDebt, setHasDebt] = useState<boolean | undefined>(getInitialHasDebt);
  const [page, setPage] = useState(0);
  const limit = 50;

  // Fetch clients
  const { data: clients, isLoading } = trpc.clients.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    clientTypes: clientTypes.length > 0 ? clientTypes : undefined,
    hasDebt,
  });

  // Fetch total count for pagination
  const { data: totalCount } = trpc.clients.count.useQuery({
    search: search || undefined,
    clientTypes: clientTypes.length > 0 ? clientTypes : undefined,
    hasDebt,
  });

  const totalPages = Math.ceil((totalCount || 0) / limit);

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sort clients locally (since backend doesn't support all sort columns yet)
  const displayClients = useMemo(() => {
    if (!clients) return [];
    if (!sortColumn) return clients;
    
    return [...clients].sort((a: any, b: any) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Convert string numbers to actual numbers for proper sorting
      if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
        aVal = parseFloat(aVal);
      }
      if (typeof bVal === 'string' && !isNaN(parseFloat(bVal))) {
        bVal = parseFloat(bVal);
      }
      
      // Compare
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, sortColumn, sortDirection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd/Ctrl+K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Cmd/Ctrl+N: New client
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setAddClientOpen(true);
      }
      
      // Arrow navigation (only when not in input)
      if (displayClients && displayClients.length > 0 && document.activeElement?.tagName !== 'INPUT') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(displayClients.length - 1, prev + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          const client = displayClients[selectedIndex];
          if (client) setLocation(`/clients/${client.id}`);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayClients, selectedIndex, setLocation]);
  
  // Reset selected index when data changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [page, search, clientTypes, hasDebt]);
  
  // Persist saved views to localStorage
  useEffect(() => {
    localStorage.setItem('client-filter-views', JSON.stringify(savedViews));
  }, [savedViews]);
  
  // Apply a saved view
  const applyView = (view: FilterView) => {
    setSearch(view.search);
    setClientTypes(view.clientTypes);
    setHasDebt(view.hasDebt);
    setPage(0);
  };
  
  // Save current filters as a new view
  const saveCurrentView = () => {
    if (!newViewName.trim()) return;
    
    const newView: FilterView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      search,
      clientTypes,
      hasDebt,
    };
    
    setSavedViews(prev => [...prev, newView]);
    setNewViewName('');
    setShowSaveDialog(false);
  };
  
  // Delete a saved view
  const deleteView = (id: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== id));
  };
  
  // Check if current filters match a view
  const isViewActive = (view: FilterView) => {
    return (
      search === view.search &&
      JSON.stringify(clientTypes.sort()) === JSON.stringify(view.clientTypes.sort()) &&
      hasDebt === view.hasDebt
    );
  };
  
  // Start editing a client
  const startEdit = (client: any) => {
    setEditingClientId(client.id);
    setEditForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
    });
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingClientId(null);
    setEditForm({ name: '', email: '', phone: '' });
  };
  
  // Save edited client
  const saveEdit = () => {
    if (!editingClientId) return;
    
    updateClient.mutate({
      clientId: editingClientId,
      name: editForm.name,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
    });
  };

  // Toggle client type filter
  const toggleClientType = (type: "buyer" | "seller" | "brand" | "referee" | "contractor") => {
    setClientTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(0); // Reset to first page
  };

  // Toggle debt filter
  const toggleDebtFilter = (value: boolean | undefined) => {
    setHasDebt(value);
    setPage(0);
  };

  // Get client type badges
  const getClientTypeBadges = (client: any) => {
    const badges: { label: string; variant: "default" | "secondary" | "outline" | "destructive" }[] = [];
    if (client.isBuyer) badges.push({ label: "Buyer", variant: "default" });
    if (client.isSeller) badges.push({ label: "Supplier", variant: "secondary" });
    if (client.isBrand) badges.push({ label: "Brand", variant: "outline" });
    if (client.isReferee) badges.push({ label: "Referee", variant: "secondary" });
    if (client.isContractor) badges.push({ label: "Contractor", variant: "outline" });
    return badges;
  };

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format percentage
  const formatPercentage = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all clients, track transactions, and monitor debt
          </p>
        </div>
        <Button onClick={() => setAddClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Client
        </Button>
      </div>

      {/* Client Statistics */}
      <DataCardSection moduleId="clients" />
      
      {/* Saved Filter Views */}
      {(defaultViews.length > 0 || savedViews.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filter Views</CardTitle>
                <CardDescription>Quick access to common filter combinations</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                disabled={!search && clientTypes.length === 0 && hasDebt === undefined}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {/* Default Views */}
              {defaultViews.map(view => (
                <Button
                  key={view.id}
                  variant={isViewActive(view) ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyView(view)}
                >
                  {view.name}
                </Button>
              ))}
              
              {/* Custom Saved Views */}
              {savedViews.map(view => (
                <div key={view.id} className="relative group">
                  <Button
                    variant={isViewActive(view) ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyView(view)}
                    className="pr-8"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    {view.name}
                  </Button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteView(view.id);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            {/* Save Dialog */}
            {showSaveDialog && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter view name..."
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCurrentView();
                      if (e.key === 'Escape') setShowSaveDialog(false);
                    }}
                    autoFocus
                  />
                  <Button onClick={saveCurrentView} disabled={!newViewName.trim()}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Search across all client fields or filter by type and debt status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search by TERI code, name, email, phone, or address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Client Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Client Types
                  {clientTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {clientTypes.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("buyer")}
                  onCheckedChange={() => toggleClientType("buyer")}
                >
                  Buyer
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("seller")}
                  onCheckedChange={() => toggleClientType("seller")}
                >
                  Supplier
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("brand")}
                  onCheckedChange={() => toggleClientType("brand")}
                >
                  Brand
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("referee")}
                  onCheckedChange={() => toggleClientType("referee")}
                >
                  Referee
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("contractor")}
                  onCheckedChange={() => toggleClientType("contractor")}
                >
                  Contractor
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Debt Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Debt Status
                  {hasDebt !== undefined && <Badge variant="secondary" className="ml-2">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter by Debt</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={hasDebt === undefined}
                  onCheckedChange={() => toggleDebtFilter(undefined)}
                >
                  All Clients
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={hasDebt === true}
                  onCheckedChange={() => toggleDebtFilter(true)}
                >
                  Has Debt
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={hasDebt === false}
                  onCheckedChange={() => toggleDebtFilter(false)}
                >
                  No Debt
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {(clientTypes.length > 0 || hasDebt !== undefined || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClientTypes([]);
                  setHasDebt(undefined);
                  setSearch("");
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({totalCount || 0})</CardTitle>
          <CardDescription>
            Showing {page * limit + 1}-{Math.min((page + 1) * limit, totalCount || 0)} of {totalCount || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
          ) : !clients || clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm mt-2">Try adjusting your filters or add a new client</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('teriCode')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        title="TERI Code: Unique identifier for each client (format: CLI-XXXXXXXX)"
                      >
                        TERI Code
                        {sortColumn === 'teriCode' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Client Types</TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort('totalSpent')}
                        className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      >
                        Total Spent
                        {sortColumn === 'totalSpent' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort('totalProfit')}
                        className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      >
                        Total Profit
                        {sortColumn === 'totalProfit' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort('avgProfitMargin')}
                        className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      >
                        Avg Margin
                        {sortColumn === 'avgProfitMargin' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort('totalOwed')}
                        className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      >
                        Amount Owed
                        {sortColumn === 'totalOwed' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort('oldestDebtDays')}
                        className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      >
                        Oldest Debt
                        {sortColumn === 'oldestDebtDays' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayClients.map((client: any, index: number) => (
                    <TableRow
                      key={client.id}
                      className={`${editingClientId === client.id ? '' : 'cursor-pointer hover:bg-muted/50'} transition-colors ${
                        index === selectedIndex ? 'bg-accent' : ''
                      }`}
                      onClick={() => {
                        if (editingClientId !== client.id) {
                          setLocation(`/clients/${client.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{client.teriCode}</TableCell>
                      <TableCell>
                        {editingClientId === client.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="h-8"
                            autoFocus
                          />
                        ) : (
                          <span>{client.name || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClientId === client.id ? (
                          <div className="space-y-1">
                            <Input
                              value={editForm.email}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email"
                              className="h-7 text-xs"
                            />
                            <Input
                              value={editForm.phone}
                              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Phone"
                              className="h-7 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="text-muted-foreground">{client.email || '-'}</div>
                            <div className="text-muted-foreground">{client.phone || '-'}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getClientTypeBadges(client).map((badge, idx) => (
                            <Badge key={idx} variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(client.totalSpent || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.totalProfit || 0)}</TableCell>
                      <TableCell className="text-right">{formatPercentage(client.avgProfitMargin || 0)}</TableCell>
                      <TableCell className="text-right">
                        {client.totalOwed && parseFloat(client.totalOwed as string) > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/clients/${client.id}?tab=transactions&action=payment`);
                              }}
                              className="text-destructive font-medium hover:underline"
                            >
                              {formatCurrency(client.totalOwed || 0)}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{formatCurrency(0)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.oldestDebtDays && client.oldestDebtDays > 0 ? (
                          <span className="text-destructive font-medium">{client.oldestDebtDays} days</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.tags && Array.isArray(client.tags) && client.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(client.tags as string[]).slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                            {(client.tags as string[]).length > 2 && (
                              <Badge variant="outline">+{(client.tags as string[]).length - 2}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingClientId === client.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit();
                              }}
                              disabled={updateClient.isPending || !editForm.name.trim()}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuCheckboxItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/clients/${client.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(client);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Quick Edit
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/clients/${client.id}?tab=transactions&action=new`);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Add Transaction
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/clients/${client.id}?tab=transactions&action=payment`);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Record Payment
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/clients/${client.id}?tab=notes&action=new`);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Add Note
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement archive
                                console.log('Archive client:', client.id);
                              }}
                              className="text-destructive"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Client
                            </DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Wizard */}
      <AddClientWizard
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onSuccess={(clientId) => {
          // Navigate to client profile
          setLocation(`/clients/${clientId}`);
        }}
      />
    </div>
  );
}