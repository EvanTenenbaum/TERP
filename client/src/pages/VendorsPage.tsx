import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileText,
  Download,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { VendorNotesDialog } from "../components/VendorNotesDialog";
import { useLocation } from "wouter";
import { useMemo } from "react";

interface Vendor {
  id: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorFormData {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentTerms: string;
  notes: string;
}

const PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Due on Receipt",
  "COD (Cash on Delivery)",
  "2/10 Net 30", // 2% discount if paid within 10 days, otherwise net 30
  "Custom",
];

export default function VendorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedVendorForNotes, setSelectedVendorForNotes] =
    useState<Vendor | null>(null);
  const [filterPaymentTerms, setFilterPaymentTerms] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "paymentTerms" | "createdAt">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    paymentTerms: "",
    notes: "",
  });

  // Fetch all vendors
  const { data: vendorsResponse, isLoading } = trpc.vendors.getAll.useQuery();

  const vendors = useMemo(() => {
    if (!vendorsResponse) return [];
    if ('success' in vendorsResponse && vendorsResponse.success && 'data' in vendorsResponse) {
      return vendorsResponse.data;
    }
    if (Array.isArray(vendorsResponse)) return vendorsResponse;
    return [];
  }, [vendorsResponse]);

  // Filter and sort vendors
  const filteredAndSortedVendors = vendors
    .filter((vendor: Vendor) => {
      // Search filter
      const matchesSearch =
        vendor.name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        vendor.contactName
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        vendor.contactEmail
          ?.toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());

      // Payment terms filter
      const matchesPaymentTerms =
        !filterPaymentTerms || vendor.paymentTerms === filterPaymentTerms;

      return matchesSearch && matchesPaymentTerms;
    })
    .sort((a: Vendor, b: Vendor) => {
      let compareValue = 0;

      if (sortBy === "name") {
        compareValue = a.name.localeCompare(b.name);
      } else if (sortBy === "paymentTerms") {
        compareValue = (a.paymentTerms || "").localeCompare(
          b.paymentTerms || ""
        );
      } else if (sortBy === "createdAt") {
        compareValue =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

  // Calculate statistics
  const stats = {
    total: vendors.length,
    withPaymentTerms: vendors.filter((v: Vendor) => v.paymentTerms).length,
    withContacts: vendors.filter((v: Vendor) => v.contactEmail || v.contactPhone).length,
    paymentTermsBreakdown: vendors.reduce(
      (acc: Record<string, number>, v: Vendor) => {
        const term = v.paymentTerms || "Not Set";
        acc[term] = (acc[term] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  // Get unique payment terms for filter dropdown
  const uniquePaymentTerms = Array.from(
    new Set(vendors.map((v: Vendor) => v.paymentTerms).filter(Boolean))
  ).sort();

  // Create vendor mutation
  const createMutation = trpc.vendors.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Vendor created",
        description: "The vendor has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateMutation = trpc.vendors.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setIsEditDialogOpen(false);
      setEditingVendor(null);
      resetForm();
      toast({
        title: "Vendor updated",
        description: "The vendor has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteMutation = trpc.vendors.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({
        title: "Vendor deleted",
        description: "The vendor has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      paymentTerms: "",
      notes: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingVendor) return;
    updateMutation.mutate({ ...formData, id: editingVendor.id });
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contactName: vendor.contactName || "",
      contactEmail: vendor.contactEmail || "",
      contactPhone: vendor.contactPhone || "",
      paymentTerms: vendor.paymentTerms || "",
      notes: vendor.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    const { exportToCSV } = require("../lib/exportUtils");
    exportToCSV(
      filteredAndSortedVendors,
      `vendors-${new Date().toISOString().split("T")[0]}.csv`,
      [
        { key: "name", label: "Vendor Name" },
        { key: "contactName", label: "Contact Name" },
        { key: "contactEmail", label: "Contact Email" },
        { key: "contactPhone", label: "Contact Phone" },
        { key: "paymentTerms", label: "Payment Terms" },
        { key: "createdAt", label: "Created Date" },
      ]
    );
    toast({
      title: "Export successful",
      description: `Exported ${filteredAndSortedVendors.length} vendors to CSV`,
    });
  };

  const toggleSort = (column: "name" | "paymentTerms" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vendors and supplier relationships
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Vendors</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">
            With Payment Terms
          </div>
          <div className="text-2xl font-bold">{stats.withPaymentTerms}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">With Contacts</div>
          <div className="text-2xl font-bold">{stats.withContacts}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Filtered Results</div>
          <div className="text-2xl font-bold">
            {filteredAndSortedVendors.length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name, contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filterPaymentTerms}
              onChange={e => setFilterPaymentTerms(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Payment Terms</option>
              {uniquePaymentTerms.map(term => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Vendor Name
                  <ArrowUpDown className="h-3 w-3" />
                  {sortBy === "name" && (
                    <span className="text-xs">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("paymentTerms")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Payment Terms
                  <ArrowUpDown className="h-3 w-3" />
                  {sortBy === "paymentTerms" && (
                    <span className="text-xs">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedVendors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery
                    ? "No vendors found matching your search."
                    : "No vendors yet. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedVendors.map(vendor => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => setLocation(`/vendors/${vendor.id}`)}
                      className="text-primary hover:underline text-left"
                    >
                      {vendor.name}
                    </button>
                  </TableCell>
                  <TableCell>{vendor.contactName || "—"}</TableCell>
                  <TableCell>{vendor.contactEmail || "—"}</TableCell>
                  <TableCell>{vendor.contactPhone || "—"}</TableCell>
                  <TableCell>
                    {vendor.paymentTerms ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {vendor.paymentTerms}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedVendorForNotes(vendor);
                          setNotesDialogOpen(true);
                        }}
                        title="View Notes & History"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(vendor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(vendor.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Vendor Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor to your system with payment terms and contact
              information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter vendor name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={e =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                placeholder="Enter contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={e =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                placeholder="vendor@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={e =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <select
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={e =>
                  setFormData({ ...formData, paymentTerms: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select payment terms</option>
                {PAYMENT_TERMS_OPTIONS.map(term => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this vendor..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information and payment terms.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Vendor Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter vendor name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactName">Contact Name</Label>
              <Input
                id="edit-contactName"
                value={formData.contactName}
                onChange={e =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                placeholder="Enter contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactEmail">Contact Email</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={e =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                placeholder="vendor@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactPhone">Contact Phone</Label>
              <Input
                id="edit-contactPhone"
                value={formData.contactPhone}
                onChange={e =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-paymentTerms">Payment Terms</Label>
              <select
                id="edit-paymentTerms"
                value={formData.paymentTerms}
                onChange={e =>
                  setFormData({ ...formData, paymentTerms: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select payment terms</option>
                {PAYMENT_TERMS_OPTIONS.map(term => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this vendor..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Notes & History Dialog */}
      {selectedVendorForNotes && (
        <VendorNotesDialog
          vendorId={selectedVendorForNotes.id}
          vendorName={selectedVendorForNotes.name}
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
        />
      )}
    </div>
  );
}
