import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ProfileSection } from "@/components/account/ProfileSection";
import { PasswordChangeSection } from "@/components/account/PasswordChangeSection";
import { Bell, Settings } from "lucide-react";

/**
 * My Account Page (UX-051)
 *
 * Provides users with a dedicated page to:
 * - View and edit their profile information
 * - Change their password
 * - Access notification preferences
 */
export default function AccountPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-8">My Account</h1>

      <div className="space-y-8">
        <ProfileSection />
        <PasswordChangeSection />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/notifications"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <Settings className="h-4 w-4" />
              Manage notification preferences →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
