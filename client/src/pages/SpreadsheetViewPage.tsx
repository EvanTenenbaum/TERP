import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryGrid } from "@/components/spreadsheet/InventoryGrid";
import { ClientGrid } from "@/components/spreadsheet/ClientGrid";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { Loader2 } from "lucide-react";

export default function SpreadsheetViewPage() {
  const { enabled, isLoading, error } = useFeatureFlag("spreadsheet-view");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading feature flags…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Spreadsheet View</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!enabled) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Spreadsheet View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant="outline">Feature Flag: spreadsheet-view</Badge>
          <p className="text-sm text-muted-foreground">
            The unified spreadsheet experience is currently disabled. Enable the{" "}
            <span className="font-semibold text-foreground">spreadsheet-view</span> flag to access this feature.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-foreground">Spreadsheet View</h1>
          <p className="text-sm text-muted-foreground">
            Familiar grid workflows backed by existing TERP validations, permissions, and audit logs.
          </p>
        </div>
        <Badge variant="outline">Feature Flag: spreadsheet-view</Badge>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="space-y-4">
          <InventoryGrid />
        </TabsContent>
        <TabsContent value="clients" className="space-y-4">
          <ClientGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
}
