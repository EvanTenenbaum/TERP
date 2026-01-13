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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Settings,
  User,
  Shield,
  Palette,
  Globe,
  Clock,
  ExternalLink,
} from "lucide-react";

/**
 * My Account Page (UX-051, UX-010)
 * Sprint 5.C.3: UX-010 - Clearly differentiate My Account and System Settings
 *
 * My Account = Personal settings:
 * - Profile information (name, email, avatar)
 * - Password management
 * - Personal preferences (theme, language, timezone)
 * - Notification preferences
 *
 * Distinct from System Settings which includes:
 * - Organization configuration
 * - User management (admin)
 * - Role/permission management
 * - Feature flags
 */
export default function AccountPage() {
  return (
    <div className="container max-w-4xl py-8">
      {/* Header with clear distinction */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Account</h1>
            <p className="text-muted-foreground text-sm">
              Manage your personal settings and preferences
            </p>
          </div>
        </div>

        {/* Help text to distinguish from System Settings */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <strong>Looking for system-wide settings?</strong>{" "}
            <Link
              href="/settings"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Go to System Settings
              <ExternalLink className="h-3 w-3" />
            </Link>{" "}
            to manage users, permissions, and organization configuration.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Profile Information</h2>
            <Badge variant="outline" className="ml-2">
              Personal
            </Badge>
          </div>
          <ProfileSection />
        </section>

        <Separator />

        {/* Password Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Security</h2>
            <Badge variant="outline" className="ml-2">
              Personal
            </Badge>
          </div>
          <PasswordChangeSection />
        </section>

        <Separator />

        {/* Personal Preferences Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Preferences</h2>
            <Badge variant="outline" className="ml-2">
              Personal
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </CardTitle>
                <CardDescription>Customize the app appearance</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/settings?tab=organization"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  Manage theme settings
                  <Settings className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Regional Settings
                </CardTitle>
                <CardDescription>
                  Timezone and date format preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Uses system timezone by default
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </CardTitle>
                <CardDescription>
                  Select your preferred language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  English (default)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </CardTitle>
                <CardDescription>Manage how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/settings?tab=notifications"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  Manage notification preferences
                  <Settings className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
