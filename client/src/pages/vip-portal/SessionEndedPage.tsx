/**
 * VIP Portal Session Ended Page (FEATURE-012)
 * 
 * Displayed when an impersonation session ends and the tab couldn't be closed.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

export default function SessionEndedPage() {
  const handleClose = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle>Session Ended</CardTitle>
          <CardDescription>
            Your impersonation session has been terminated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            You can safely close this tab now.
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close Tab
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
