/**
 * AdvancedFilters Component
 * Comprehensive filtering panel for inventory
 * ENH-007: Uses dynamic Brand/Farmer terminology based on category filter
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, ChevronDown, ChevronUp, Hash } from "lucide-react";
import type { InventoryFilters } from "@/hooks/useInventoryFilters";
import { getBrandLabel } from "@/lib/nomenclature";

interface AdvancedFiltersProps {
  filters: InventoryFilters;
  onUpdateFilter: <K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K]
  ) => void;
  vendors: string[];
  brands: string[];
  categories: string[];
  subcategories: string[];
  grades: string[];
}

export function AdvancedFilters({
  filters,
  onUpdateFilter,
  vendors,
  brands,
  categories,
  subcategories,
  grades,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statuses = [
    "AWAITING_INTAKE",
    "LIVE",
    "ON_HOLD",
    "QUARANTINED",
    "SOLD_OUT",
    "CLOSED",
  ];

  const paymentStatuses = ["PAID", "PARTIAL", "UNPAID"];

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onUpdateFilter("status", newStatuses);
  };

  const toggleVendor = (vendor: string) => {
    const newVendors = filters.vendor.includes(vendor)
      ? filters.vendor.filter((v) => v !== vendor)
      : [...filters.vendor, vendor];
    onUpdateFilter("vendor", newVendors);
  };

  const toggleBrand = (brand: string) => {
    const newBrands = filters.brand.includes(brand)
      ? filters.brand.filter((b) => b !== brand)
      : [...filters.brand, brand];
    onUpdateFilter("brand", newBrands);
  };

  const toggleGrade = (grade: string) => {
    const newGrades = filters.grade.includes(grade)
      ? filters.grade.filter((g) => g !== grade)
      : [...filters.grade, grade];
    onUpdateFilter("grade", newGrades);
  };

  const togglePaymentStatus = (status: string) => {
    const newStatuses = filters.paymentStatus.includes(status)
      ? filters.paymentStatus.filter((s) => s !== status)
      : [...filters.paymentStatus, status];
    onUpdateFilter("paymentStatus", newStatuses);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Advanced Filters</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm cursor-pointer"
                  >
                    {status.replace(/_/g, " ")}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(value) =>
                onUpdateFilter("category", value === "all" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={filters.subcategory || "all"}
                onValueChange={(value) =>
                  onUpdateFilter("subcategory", value === "all" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stock Level Filter */}
          <div className="space-y-2">
            <Label>Stock Level</Label>
            <Select
              value={filters.stockLevel}
              onValueChange={(value: InventoryFilters["stockLevel"]) => onUpdateFilter("stockLevel", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Filter */}
          {vendors.length > 0 && (
            <div className="space-y-2">
              <Label>Vendor</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {vendors.map((vendor) => (
                  <div key={vendor} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vendor-${vendor}`}
                      checked={filters.vendor.includes(vendor)}
                      onCheckedChange={() => toggleVendor(vendor)}
                    />
                    <label
                      htmlFor={`vendor-${vendor}`}
                      className="text-sm cursor-pointer"
                    >
                      {vendor}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brand/Farmer Filter - ENH-007: Dynamic label based on category */}
          {brands.length > 0 && (
            <div className="space-y-2">
              <Label>{getBrandLabel(filters.category)}</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {brands.map((brand) => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${brand}`}
                      checked={filters.brand.includes(brand)}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <label
                      htmlFor={`brand-${brand}`}
                      className="text-sm cursor-pointer"
                    >
                      {brand}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade Filter */}
          {grades.length > 0 && (
            <div className="space-y-2">
              <Label>Grade</Label>
              <div className="space-y-2">
                {grades.map((grade) => (
                  <div key={grade} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grade-${grade}`}
                      checked={filters.grade.includes(grade)}
                      onCheckedChange={() => toggleGrade(grade)}
                    />
                    <label
                      htmlFor={`grade-${grade}`}
                      className="text-sm cursor-pointer"
                    >
                      {grade}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Status Filter */}
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <div className="space-y-2">
              {paymentStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`payment-${status}`}
                    checked={filters.paymentStatus.includes(status)}
                    onCheckedChange={() => togglePaymentStatus(status)}
                  />
                  <label
                    htmlFor={`payment-${status}`}
                    className="text-sm cursor-pointer"
                  >
                    {status}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sprint 4 Track A: 4.A.2 ENH-001 - Stock Status Filter */}
          <div className="space-y-2">
            <Label>Stock Status</Label>
            <Select
              value={filters.stockStatus}
              onValueChange={(value: InventoryFilters["stockStatus"]) => onUpdateFilter("stockStatus", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPTIMAL">Optimal</SelectItem>
                <SelectItem value="LOW">Low Stock</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sprint 4 Track A: 4.A.2 ENH-001 - Age Bracket Filter */}
          <div className="space-y-2">
            <Label>Age Bracket</Label>
            <Select
              value={filters.ageBracket}
              onValueChange={(value: InventoryFilters["ageBracket"]) => onUpdateFilter("ageBracket", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Ages</SelectItem>
                <SelectItem value="FRESH">Fresh (0-7 days)</SelectItem>
                <SelectItem value="MODERATE">Moderate (8-14 days)</SelectItem>
                <SelectItem value="AGING">Aging (15-30 days)</SelectItem>
                <SelectItem value="CRITICAL">Critical (30+ days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sprint 4 Track A: 4.A.6 MEET-023 - Batch ID Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              Batch ID
            </Label>
            <Input
              placeholder="Search by batch code..."
              value={filters.batchId || ""}
              onChange={(e) => onUpdateFilter("batchId", e.target.value || null)}
              className="font-mono"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

