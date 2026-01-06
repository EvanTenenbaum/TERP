import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash, Search, Settings } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { toast } from "sonner";
import type { PricingProfile, PricingRule } from "../../../drizzle/schema";

interface ProfileFormData {
  name: string;
  description: string;
  selectedRules: Array<{ ruleId: number; priority: number }>;
}

const emptyFormData: ProfileFormData = {
  name: "",
  description: "",
  selectedRules: [],
};

export default function PricingProfilesPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PricingProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(emptyFormData);

  // Fetch pricing profiles and rules
  const { data: profiles, isLoading: profilesLoading } = trpc.pricing.listProfiles.useQuery();
  const { data: rules, isLoading: rulesLoading } = trpc.pricing.listRules.useQuery();

  // Create mutation
  const createMutation = trpc.pricing.createProfile.useMutation({
    onSuccess: () => {
      toast.success("Pricing profile created successfully");
      utils.pricing.listProfiles.invalidate();
      setCreateDialogOpen(false);
      setFormData(emptyFormData);
    },
    onError: (error) => {
      toast.error("Failed to create pricing profile: " + error.message);
    },
  });

  // Update mutation
  const updateMutation = trpc.pricing.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Pricing profile updated successfully");
      utils.pricing.listProfiles.invalidate();
      setEditDialogOpen(false);
      setSelectedProfile(null);
      setFormData(emptyFormData);
    },
    onError: (error) => {
      toast.error("Failed to update pricing profile: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.pricing.deleteProfile.useMutation({
    onSuccess: () => {
      toast.success("Pricing profile deleted successfully");
      utils.pricing.listProfiles.invalidate();
      setDeleteDialogOpen(false);
      setSelectedProfile(null);
    },
    onError: (error) => {
      toast.error("Failed to delete pricing profile: " + error.message);
    },
  });

  // Filter profiles by search
  const filteredProfiles = profiles?.filter((profile) =>
    profile.name.toLowerCase().includes(search.toLowerCase()) ||
    profile.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Handle create
  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      rules: formData.selectedRules,
    });
  };

  // Handle edit
  const handleEdit = () => {
    if (!selectedProfile) return;
    
    updateMutation.mutate({
      profileId: selectedProfile.id,
      name: formData.name,
      description: formData.description || undefined,
      rules: formData.selectedRules,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedProfile) return;
    deleteMutation.mutate({ profileId: selectedProfile.id });
  };

  // Open edit dialog
  const openEditDialog = (profile: PricingProfile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      selectedRules: (profile.rules as Array<{ ruleId: number; priority: number }>) || [],
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (profile: PricingProfile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  // Toggle rule selection
  const toggleRuleSelection = (ruleId: number) => {
    const isSelected = formData.selectedRules.some((r) => r.ruleId === ruleId);
    
    if (isSelected) {
      setFormData({
        ...formData,
        selectedRules: formData.selectedRules.filter((r) => r.ruleId !== ruleId),
      });
    } else {
      setFormData({
        ...formData,
        selectedRules: [
          ...formData.selectedRules,
          { ruleId, priority: formData.selectedRules.length },
        ],
      });
    }
  };

  // Update rule priority
  const updateRulePriority = (ruleId: number, priority: number) => {
    setFormData({
      ...formData,
      selectedRules: formData.selectedRules.map((r) =>
        r.ruleId === ruleId ? { ...r, priority } : r
      ),
    });
  };

  // Get rule name by ID
  const getRuleName = (ruleId: number) => {
    const rule = rules?.find((r) => r.id === ruleId);
    return rule?.name || `Rule #${ruleId}`;
  };

  // Render profile form
  const renderProfileForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Profile Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Premium Customer Pricing"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this pricing profile..."
          rows={2}
        />
      </div>

      <div>
        <Label>Select Pricing Rules</Label>
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-md p-4">
          {rulesLoading ? (
            <p className="text-sm text-muted-foreground">Loading rules...</p>
          ) : rules && rules.length > 0 ? (
            rules.map((rule) => {
              const isSelected = formData.selectedRules.some((r) => r.ruleId === rule.id);
              const selectedRule = formData.selectedRules.find((r) => r.ruleId === rule.id);
              
              return (
                <div key={rule.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleRuleSelection(rule.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Priority:</Label>
                      <Input
                        type="number"
                        value={selectedRule?.priority || 0}
                        onChange={(e) => updateRulePriority(rule.id, parseInt(e.target.value))}
                        className="w-20 h-8"
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No pricing rules available. Create rules first.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {formData.selectedRules.length} rule(s) selected
        </p>
      </div>
    </div>
  );

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading pricing profiles...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Pricing Profiles</CardTitle>
              <CardDescription>
                Manage collections of pricing rules for easy application to clients
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Rules Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No pricing profiles found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((profile) => {
                    const profileRules = (profile.rules as Array<{ ruleId: number; priority: number }>) || [];
                    
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile.description || "No description"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {profileRules.length} rule(s)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(profile)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(profile)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Pricing Profile</DialogTitle>
            <DialogDescription>
              Create a new pricing profile with selected rules
            </DialogDescription>
          </DialogHeader>
          {renderProfileForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!formData.name || formData.selectedRules.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pricing Profile</DialogTitle>
            <DialogDescription>
              Update the pricing profile configuration
            </DialogDescription>
          </DialogHeader>
          {renderProfileForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={!formData.name || formData.selectedRules.length === 0 || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProfile?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

