import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Eye,
  Settings,
  Shield,
  Clock,
  Mail,
  ExternalLink,
  Power,
  PowerOff,
  RefreshCw,
} from "lucide-react";

interface VIPPortalSettingsProps {
  clientId: number;
  clientName: string;
  vipPortalEnabled: boolean;
  vipPortalLastLogin?: Date | string | null;
}

export function VIPPortalSettings({
  clientId,
  clientName,
  vipPortalEnabled,
  vipPortalLastLogin,
}: VIPPortalSettingsProps) {
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isImpersonating, setIsImpersonating] = useState(false);

  const utils = trpc.useUtils();

  // Get VIP portal configuration if enabled
  const { data: config, isLoading: configLoading } = trpc.vipPortalAdmin.config.get.useQuery(
    { clientId },
    { enabled: vipPortalEnabled }
  );

  // Get last login info
  const { data: loginInfo } = trpc.vipPortalAdmin.clients.getLastLogin.useQuery(
    { clientId },
    { enabled: vipPortalEnabled }
  );

  // Enable VIP portal mutation
  const enableMutation = trpc.vipPortalAdmin.clients.enableVipPortal.useMutation({
    onSuccess: () => {
      toast.success("VIP Portal enabled successfully");
      setEnableDialogOpen(false);
      setEmail("");
      setPassword("");
      utils.clients.getById.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enable VIP Portal");
    },
  });

  // Disable VIP portal mutation
  const disableMutation = trpc.vipPortalAdmin.clients.disableVipPortal.useMutation({
    onSuccess: () => {
      toast.success("VIP Portal disabled");
      setDisableDialogOpen(false);
      utils.clients.getById.invalidate({ clientId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disable VIP Portal");
    },
  });

  // Impersonation mutation
  const impersonateMutation = trpc.vipPortalAdmin.clients.impersonate.useMutation({
    onSuccess: (data) => {
      // Store impersonation session
      localStorage.setItem("vip_session_token", data.sessionToken);
      localStorage.setItem("vip_client_id", clientId.toString());
      localStorage.setItem("vip_client_name", clientName);
      localStorage.setItem("vip_impersonation", "true");
      
      // Open VIP portal in new tab
      window.open("/vip-portal/dashboard", "_blank");
      setIsImpersonating(false);
      toast.success(`Viewing portal as ${clientName}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start impersonation session");
      setIsImpersonating(false);
    },
  });

  const handleEnablePortal = () => {
    if (!email || !password) {
      toast.error("Please provide email and initial password");
      return;
    }
    enableMutation.mutate({
      clientId,
      email,
      initialPassword: password,
    });
  };

  const handleDisablePortal = () => {
    disableMutation.mutate({ clientId });
  };

  const handleViewAsClient = () => {
    setIsImpersonating(true);
    impersonateMutation.mutate({ clientId });
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate a random password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              VIP Client Portal
            </CardTitle>
            <CardDescription>
              Manage portal access and settings for this client
            </CardDescription>
          </div>
          <Badge variant={vipPortalEnabled ? "default" : "secondary"}>
            {vipPortalEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portal Status Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Portal Access</Label>
            <p className="text-sm text-muted-foreground">
              {vipPortalEnabled
                ? "Client can access the VIP Portal"
                : "Enable to give client portal access"}
            </p>
          </div>
          {vipPortalEnabled ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDisableDialogOpen(true)}
            >
              <PowerOff className="h-4 w-4 mr-2" />
              Disable
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setEnableDialogOpen(true)}
            >
              <Power className="h-4 w-4 mr-2" />
              Enable
            </Button>
          )}
        </div>

        {vipPortalEnabled && (
          <>
            <Separator />

            {/* View as Client Button */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">View as Client</Label>
                <p className="text-sm text-muted-foreground">
                  Open the portal as this client would see it
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleViewAsClient}
                disabled={isImpersonating}
              >
                {isImpersonating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Portal
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Portal Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Login
                </Label>
                <p className="text-sm font-medium">
                  {formatDate(loginInfo?.lastLogin || vipPortalLastLogin)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Total Logins
                </Label>
                <p className="text-sm font-medium">
                  {loginInfo?.loginCount || 0}
                </p>
              </div>
            </div>

            <Separator />

            {/* Module Configuration Summary */}
            {!configLoading && config && (
              <div className="space-y-3">
                <Label className="text-base">Enabled Modules</Label>
                <div className="flex flex-wrap gap-2">
                  {config.moduleDashboardEnabled && (
                    <Badge variant="outline">Dashboard</Badge>
                  )}
                  {config.moduleLiveCatalogEnabled && (
                    <Badge variant="outline">Live Catalog</Badge>
                  )}
                  {config.moduleArEnabled && (
                    <Badge variant="outline">Receivables</Badge>
                  )}
                  {config.moduleApEnabled && (
                    <Badge variant="outline">Payables</Badge>
                  )}
                  {config.moduleTransactionHistoryEnabled && (
                    <Badge variant="outline">Transactions</Badge>
                  )}
                  {config.moduleVipTierEnabled && (
                    <Badge variant="outline">VIP Tier</Badge>
                  )}
                  {config.moduleCreditCenterEnabled && (
                    <Badge variant="outline">Credit Center</Badge>
                  )}
                  {config.moduleMarketplaceNeedsEnabled && (
                    <Badge variant="outline">Marketplace Needs</Badge>
                  )}
                  {config.moduleMarketplaceSupplyEnabled && (
                    <Badge variant="outline">Marketplace Supply</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Link to Full Configuration */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => window.location.href = `/clients/${clientId}/vip-portal-config`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced Portal Configuration
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </>
        )}
      </CardContent>

      {/* Enable Portal Dialog */}
      <Dialog open={enableDialogOpen} onOpenChange={setEnableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable VIP Portal</DialogTitle>
            <DialogDescription>
              Set up portal access for {clientName}. They will use these credentials to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="portal-email">
                <Mail className="h-4 w-4 inline mr-2" />
                Portal Email
              </Label>
              <Input
                id="portal-email"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The email address the client will use to log in
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-password">Initial Password</Label>
              <div className="flex gap-2">
                <Input
                  id="portal-password"
                  type="text"
                  placeholder="Initial password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this password securely with the client
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEnableDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnablePortal}
              disabled={enableMutation.isPending || !email || !password}
            >
              {enableMutation.isPending ? "Enabling..." : "Enable Portal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Portal Confirmation */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable VIP Portal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke {clientName}'s access to the VIP Portal. Their
              configuration will be preserved and can be re-enabled later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisablePortal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableMutation.isPending ? "Disabling..." : "Disable Portal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
