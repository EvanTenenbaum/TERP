import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Clock, Users, Building2, Bell, Shield } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

  const settingsModules = [
    {
      title: "Data Imports",
      description: "Import data from CSV, Excel, or external systems",
      icon: Upload,
      route: "/admin/imports",
      color: "text-brand",
    },
    {
      title: "Cron Jobs",
      description: "Scheduled tasks and automation workflows",
      icon: Clock,
      route: "/admin/cron",
      color: "text-success",
    },
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: Users,
      route: "/settings/users",
      color: "text-warning",
      disabled: true,
    },
    {
      title: "Company Profile",
      description: "Business information and branding",
      icon: Building2,
      route: "/settings/company",
      color: "text-accent",
      disabled: true,
    },
    {
      title: "Notifications",
      description: "Email alerts and notification preferences",
      icon: Bell,
      route: "/settings/notifications",
      color: "text-muted-foreground",
      disabled: true,
    },
    {
      title: "Security",
      description: "Authentication, API keys, and audit logs",
      icon: Shield,
      route: "/settings/security",
      color: "text-destructive",
      disabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">System configuration and administration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsModules.map((module) => (
          <Card 
            key={module.route} 
            className={`p-6 transition-fast ${module.disabled ? 'opacity-50' : 'hover:bg-elevated cursor-pointer'}`}
            onClick={() => !module.disabled && navigate(module.route)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-panel ${module.color}`}>
                <module.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">
                  {module.title}
                  {module.disabled && <span className="ml-2 text-xs text-muted-foreground">(Coming Soon)</span>}
                </h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
              {!module.disabled && <Button variant="ghost" size="sm">Open</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
