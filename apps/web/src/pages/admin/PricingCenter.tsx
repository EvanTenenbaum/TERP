import { useState } from "react";
import { Plus, Tag, TrendingUp, Percent, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data/DataTable";
import { mockPriceBook, mockPriceTiers, mockPriceRules, mockPromos } from "@/lib/mockData";

export default function PricingCenter() {
  const [activeTab, setActiveTab] = useState("pricebook");

  const priceBookColumns = [
    { key: "sku", label: "SKU" },
    { key: "inventory_id", label: "Item" },
    { key: "base_price", label: "Base Price", format: (val: number) => `$${val.toFixed(2)}` },
    { key: "active", label: "Status", format: (val: boolean) => val ? "Active" : "Inactive" },
  ];

  const tierColumns = [
    { key: "name", label: "Tier Name" },
    { key: "percent_adjustment", label: "Adjustment", format: (val: number) => `${val > 0 ? '+' : ''}${val}%` },
  ];

  const ruleColumns = [
    { key: "name", label: "Rule Name" },
    { key: "scope", label: "Scope" },
    { key: "effect_type", label: "Type" },
    { key: "effect_value", label: "Value" },
    { key: "start", label: "Start Date", format: (val: string) => new Date(val).toLocaleDateString() },
    { key: "combinable", label: "Combinable", format: (val: boolean) => val ? "Yes" : "No" },
  ];

  const promoColumns = [
    { key: "code", label: "Promo Code" },
    { key: "effect_type", label: "Type" },
    { key: "effect_value", label: "Value" },
    { key: "start", label: "Start Date", format: (val: string) => new Date(val).toLocaleDateString() },
    { key: "end", label: "End Date", format: (val: string) => val ? new Date(val).toLocaleDateString() : "N/A" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Pricing Center</h1>
          <p className="text-sm text-muted-foreground">
            Manage price books, tiers, rules, and promotions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricebook">
            <Tag className="h-4 w-4 mr-2" />
            Price Book
          </TabsTrigger>
          <TabsTrigger value="tiers">
            <TrendingUp className="h-4 w-4 mr-2" />
            Tiers
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Percent className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="promos">
            <Gift className="h-4 w-4 mr-2" />
            Promos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricebook" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {mockPriceBook.length} items in price book
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          <Card>
            <DataTable columns={priceBookColumns} data={mockPriceBook} />
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {mockPriceTiers.length} pricing tiers configured
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>
          <Card>
            <DataTable columns={tierColumns} data={mockPriceTiers} />
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {mockPriceRules.length} active pricing rules
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
          <Card>
            <DataTable columns={ruleColumns} data={mockPriceRules} />
          </Card>
        </TabsContent>

        <TabsContent value="promos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {mockPromos.length} promotional codes
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Promo
            </Button>
          </div>
          <Card>
            <DataTable columns={promoColumns} data={mockPromos} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
