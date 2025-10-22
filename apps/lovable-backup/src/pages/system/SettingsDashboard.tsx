import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Settings, Download, Upload, Archive, DollarSign, Bell, Palette, FileCheck, FileText } from "lucide-react";

const settingsCards = [
  { title: "Imports", icon: Upload, url: "/system/imports", description: "Import data from CSV files" },
  { title: "Exports", icon: Download, url: "/system/exports", description: "Export data to CSV/PDF" },
  { title: "Archiving", icon: Archive, url: "/system/archiving", description: "Configure archiving rules" },
  { title: "Currency & Rounding", icon: DollarSign, url: "/system/rounding", description: "Set currency and rounding options" },
  { title: "Notifications", icon: Bell, url: "/system/notifications", description: "Manage notification settings" },
  { title: "Branding", icon: Palette, url: "/system/branding", description: "Customize branding and theme" },
  { title: "Data Hygiene", icon: FileCheck, url: "/system/hygiene", description: "Data validation rules" },
  { title: "Audit Log", icon: FileText, url: "/system/audit", description: "View audit trail" }
];

export default function SettingsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure system-wide settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map(card => (
          <Card
            key={card.url}
            className="p-6 cursor-pointer hover:bg-card/80 transition-fast"
            onClick={() => navigate(card.url)}
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-brand/10">
                <card.icon className="h-5 w-5 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
