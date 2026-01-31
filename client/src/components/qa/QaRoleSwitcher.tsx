/**
 * QA Role Switcher Component
 *
 * Provides a dropdown for QA testers to quickly switch between test accounts.
 * Only visible when QA_AUTH_ENABLED=true on the server.
 *
 * @module client/src/components/qa/QaRoleSwitcher
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FlaskConical, Shield, User } from "lucide-react";

interface QaRole {
  email: string;
  name: string;
  role: string;
  description: string;
}

interface QaAuthStatus {
  enabled: boolean;
  roles: QaRole[];
  password: string;
}

/**
 * QA Role Switcher Component
 *
 * Displays a dropdown selector for QA test accounts when QA auth is enabled.
 * Use this on the login page to allow quick role switching during testing.
 */
export function QaRoleSwitcher() {
  const [qaStatus, setQaStatus] = useState<QaAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [, setLocation] = useLocation();

  // Check if QA auth is enabled
  useEffect(() => {
    const checkQaStatus = async () => {
      try {
        const response = await fetch("/api/qa-auth/roles");
        if (response.ok) {
          const data = await response.json();
          setQaStatus(data);
        } else {
          setQaStatus(null);
        }
      } catch {
        setQaStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkQaStatus();
  }, []);

  // Login as selected QA role
  const handleQaLogin = async () => {
    if (!selectedRole || !qaStatus) return;

    const role = qaStatus.roles.find(r => r.email === selectedRole);
    if (!role) return;

    setLoginLoading(true);
    setError("");

    try {
      const response = await fetch("/api/qa-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: role.email,
          password: qaStatus.password,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "QA login failed");
      }

      // Login successful, redirect to dashboard
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "QA login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // Don't render if loading or QA auth is not enabled
  if (loading) {
    return null;
  }

  if (!qaStatus?.enabled) {
    return null;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">QA Role Switcher</CardTitle>
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-500/50"
          >
            Testing Mode
          </Badge>
        </div>
        <CardDescription>
          Quick login as any RBAC role for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a QA role..." />
            </SelectTrigger>
            <SelectContent>
              {qaStatus.roles.map(role => (
                <SelectItem key={role.email} value={role.email}>
                  <div className="flex items-center gap-2">
                    {role.role === "Super Admin" ? (
                      <Shield className="h-4 w-4 text-amber-500" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{role.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({role.role})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleQaLogin}
            disabled={!selectedRole || loginLoading}
            variant="secondary"
          >
            {loginLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Login"
            )}
          </Button>
        </div>

        {selectedRole && (
          <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/50">
            <p className="font-medium text-foreground">
              {qaStatus.roles.find(r => r.email === selectedRole)?.description}
            </p>
            <p className="text-xs mt-1 font-mono">{selectedRole}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * QA Role Badge Component
 *
 * Small badge to show when logged in as a QA user.
 * Use in the header/navbar to indicate QA mode.
 */
export function QaRoleBadge({ email }: { email?: string | null }) {
  if (!email?.includes("@terp.test")) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="text-amber-600 border-amber-500/50 text-xs"
    >
      <FlaskConical className="h-3 w-3 mr-1" />
      QA Mode
    </Badge>
  );
}

export default QaRoleSwitcher;
