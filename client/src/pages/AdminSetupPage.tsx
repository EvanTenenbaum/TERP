/**
 * Admin Setup Page
 * 
 * One-time setup page to promote users to admin role.
 * Accessible at /admin-setup
 * 
 * This is a temporary utility page - should be removed after initial setup.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Users, Shield } from "lucide-react";

const SETUP_KEY = "terp-admin-setup-2024";

export default function AdminSetupPage() {
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const promoteAllMutation = trpc.adminSetup.promoteAllToAdmin.useMutation({
    onSuccess: (data) => {
      setResult({ success: true, message: data.message });
      setLoading(false);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setLoading(false);
    },
  });

  const handlePromoteAll = () => {
    setLoading(true);
    setResult(null);
    promoteAllMutation.mutate({
      setupKey: SETUP_KEY,
      confirmPhrase: "I understand this promotes all users",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Admin Setup</CardTitle>
          <CardDescription>
            One-time setup to grant admin access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This will promote ALL users to admin role. 
                This is intended for initial setup only.
              </p>
            </div>

            <Button 
              onClick={handlePromoteAll} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Users className="w-4 h-4 mr-2" />
              {loading ? "Promoting..." : "Promote All Users to Admin"}
            </Button>

            {result?.success && (
              <div className="text-center space-y-2">
                <p className="text-sm text-green-600 font-medium">
                  ✓ Users promoted successfully!
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = "/settings/feature-flags"}
                  className="w-full"
                >
                  Go to Feature Flags
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
