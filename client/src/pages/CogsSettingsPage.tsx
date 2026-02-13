
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, DollarSign, Users } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { CogsGlobalSettings } from "@/components/cogs/CogsGlobalSettings";
import { CogsClientSettings } from "@/components/cogs/CogsClientSettings";

export default function CogsSettingsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6" />
            <div>
              <CardTitle className="text-2xl">COGS Settings</CardTitle>
              <CardDescription>
                Configure cost of goods sold calculations and client-specific adjustments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="global" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Global Settings
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Client Adjustments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-6">
              <CogsGlobalSettings />
            </TabsContent>

            <TabsContent value="clients" className="space-y-6">
              <CogsClientSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

