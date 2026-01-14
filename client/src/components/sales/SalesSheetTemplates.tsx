/**
 * SalesSheetTemplates Component
 * Sprint 5.C.7: MEET-015 - Sales Sheet Creator Enhancement
 *
 * Provides:
 * - Multiple layout templates (grid, list, catalog)
 * - Custom branding options (logo, colors, header text)
 * - Template selection UI
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutGrid,
  LayoutList,
  BookOpen,
  Palette,
  Image as ImageIcon,
  Type,
  Settings,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Layout template types
export type TemplateLayout = "grid" | "list" | "catalog" | "compact";

export interface TemplateConfig {
  layout: TemplateLayout;
  columns: 2 | 3 | 4;
  showPrices: boolean;
  showCategories: boolean;
  showQuantities: boolean;
  itemsPerPage: number;
}

export interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  contactInfo: string;
}

interface SalesSheetTemplatesProps {
  template: TemplateConfig;
  branding: BrandingConfig;
  onTemplateChange: (template: TemplateConfig) => void;
  onBrandingChange: (branding: BrandingConfig) => void;
}

const DEFAULT_TEMPLATE: TemplateConfig = {
  layout: "list",
  columns: 3,
  showPrices: true,
  showCategories: true,
  showQuantities: true,
  itemsPerPage: 20,
};

const DEFAULT_BRANDING: BrandingConfig = {
  companyName: "",
  primaryColor: "#2563eb", // Blue
  secondaryColor: "#64748b", // Slate
  headerText: "",
  footerText: "",
  contactInfo: "",
};

const TEMPLATE_LAYOUTS: Array<{
  id: TemplateLayout;
  name: string;
  description: string;
  icon: typeof LayoutGrid;
}> = [
  {
    id: "list",
    name: "List View",
    description: "Simple list with item details",
    icon: LayoutList,
  },
  {
    id: "grid",
    name: "Grid View",
    description: "Image-focused grid layout",
    icon: LayoutGrid,
  },
  {
    id: "catalog",
    name: "Catalog",
    description: "Professional catalog style",
    icon: BookOpen,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense, space-efficient layout",
    icon: LayoutList,
  },
];

const COLOR_PRESETS = [
  { name: "Blue", primary: "#2563eb", secondary: "#64748b" },
  { name: "Green", primary: "#16a34a", secondary: "#6b7280" },
  { name: "Purple", primary: "#7c3aed", secondary: "#6b7280" },
  { name: "Red", primary: "#dc2626", secondary: "#6b7280" },
  { name: "Orange", primary: "#ea580c", secondary: "#6b7280" },
  { name: "Teal", primary: "#0d9488", secondary: "#6b7280" },
];

export function SalesSheetTemplates({
  template,
  branding,
  onTemplateChange,
  onBrandingChange,
}: SalesSheetTemplatesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localTemplate, setLocalTemplate] = useState(template);
  const [localBranding, setLocalBranding] = useState(branding);

  const handleSave = () => {
    onTemplateChange(localTemplate);
    onBrandingChange(localBranding);
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setLocalTemplate(template);
    setLocalBranding(branding);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Template & Branding
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Sales Sheet</DialogTitle>
          <DialogDescription>
            Choose a layout template and customize branding for your sales sheet
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="layout" className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="layout">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="mr-2 h-4 w-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-4 mt-4">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label>Layout Template</Label>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATE_LAYOUTS.map(layout => (
                  <Card
                    key={layout.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary",
                      localTemplate.layout === layout.id &&
                        "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() =>
                      setLocalTemplate({ ...localTemplate, layout: layout.id })
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <layout.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{layout.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {layout.description}
                          </p>
                        </div>
                        {localTemplate.layout === layout.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Layout Options */}
            <div className="space-y-4 pt-4 border-t">
              <Label>Layout Options</Label>

              {localTemplate.layout === "grid" && (
                <div className="space-y-2">
                  <Label className="text-sm">Columns</Label>
                  <Select
                    value={localTemplate.columns.toString()}
                    onValueChange={value =>
                      setLocalTemplate({
                        ...localTemplate,
                        columns: parseInt(value) as 2 | 3 | 4,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Columns</SelectItem>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPrices"
                    checked={localTemplate.showPrices}
                    onChange={e =>
                      setLocalTemplate({
                        ...localTemplate,
                        showPrices: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="showPrices" className="text-sm">
                    Show Prices
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showCategories"
                    checked={localTemplate.showCategories}
                    onChange={e =>
                      setLocalTemplate({
                        ...localTemplate,
                        showCategories: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="showCategories" className="text-sm">
                    Show Categories
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showQuantities"
                    checked={localTemplate.showQuantities}
                    onChange={e =>
                      setLocalTemplate({
                        ...localTemplate,
                        showQuantities: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="showQuantities" className="text-sm">
                    Show Quantities
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Items Per Page (PDF)</Label>
                <Select
                  value={localTemplate.itemsPerPage.toString()}
                  onValueChange={value =>
                    setLocalTemplate({
                      ...localTemplate,
                      itemsPerPage: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 items</SelectItem>
                    <SelectItem value="15">15 items</SelectItem>
                    <SelectItem value="20">20 items</SelectItem>
                    <SelectItem value="25">25 items</SelectItem>
                    <SelectItem value="30">30 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4 mt-4">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={localBranding.companyName}
                  onChange={e =>
                    setLocalBranding({
                      ...localBranding,
                      companyName: e.target.value,
                    })
                  }
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={localBranding.logoUrl || ""}
                    onChange={e =>
                      setLocalBranding({
                        ...localBranding,
                        logoUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your company logo
                </p>
              </div>
            </div>

            {/* Color Scheme */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Color Scheme</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                      localBranding.primaryColor === preset.primary &&
                        "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() =>
                      setLocalBranding({
                        ...localBranding,
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary,
                      })
                    }
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="text-sm">{preset.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localBranding.primaryColor}
                      onChange={e =>
                        setLocalBranding({
                          ...localBranding,
                          primaryColor: e.target.value,
                        })
                      }
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={localBranding.primaryColor}
                      onChange={e =>
                        setLocalBranding({
                          ...localBranding,
                          primaryColor: e.target.value,
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localBranding.secondaryColor}
                      onChange={e =>
                        setLocalBranding({
                          ...localBranding,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={localBranding.secondaryColor}
                      onChange={e =>
                        setLocalBranding({
                          ...localBranding,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Header & Footer */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Header Text
                </Label>
                <Textarea
                  value={localBranding.headerText}
                  onChange={e =>
                    setLocalBranding({
                      ...localBranding,
                      headerText: e.target.value,
                    })
                  }
                  placeholder="Custom header message for your sales sheets..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Information</Label>
                <Textarea
                  value={localBranding.contactInfo}
                  onChange={e =>
                    setLocalBranding({
                      ...localBranding,
                      contactInfo: e.target.value,
                    })
                  }
                  placeholder="Phone: (555) 123-4567&#10;Email: sales@company.com"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Textarea
                  value={localBranding.footerText}
                  onChange={e =>
                    setLocalBranding({
                      ...localBranding,
                      footerText: e.target.value,
                    })
                  }
                  placeholder="Thank you for your business! Terms & conditions apply."
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export defaults for use in parent components
export { DEFAULT_TEMPLATE, DEFAULT_BRANDING };
