import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * VIP Portal Login Page
 * 
 * FIX-002: Enhanced error handling to prevent silent failures.
 * - Added console logging for debugging
 * - Improved error message extraction
 * - Added onSettled callback to ensure loading state is always reset
 * - Added inline error display for better UX
 */
export default function VIPLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = trpc.vipPortal.auth.login.useMutation({
    onSuccess: (data) => {
      // Clear any previous error
      setErrorMessage(null);
      
      // Store session token
      localStorage.setItem("vip_session_token", data.sessionToken);
      localStorage.setItem("vip_client_id", data.clientId.toString());
      localStorage.setItem("vip_client_name", data.clientName || "");
      
      toast.success("Login successful!");
      setLocation("/vip-portal/dashboard");
    },
    onError: (error) => {
      // FIX-002: Enhanced error handling to prevent silent failures
      console.error("[VIPLogin] Login error:", error);
      
      // Extract user-friendly error message
      let message = "Login failed. Please try again.";
      if (error.message) {
        message = error.message;
      } else if (error.data?.code === "UNAUTHORIZED") {
        message = "Invalid email or password";
      } else if (error.data?.code === "INTERNAL_SERVER_ERROR") {
        message = "Server error. Please try again later.";
      }
      
      // Show both toast and inline error for visibility
      toast.error(message);
      setErrorMessage(message);
    },
    onSettled: () => {
      // FIX-002: Always reset loading state when mutation completes
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null); // Clear previous error
    
    loginMutation.mutate({
      email,
      password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            VIP Client Portal
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* FIX-002: Inline error display for better visibility */}
            {errorMessage && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {errorMessage}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-sm text-muted-foreground"
              onClick={() => toast.info("Please contact support to reset your password")}
            >
              Forgot password?
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
