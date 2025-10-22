import { useState } from "react";
import { Play, Pause, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: "success" | "failed" | "running";
  enabled: boolean;
}

export default function CronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([
    { id: "1", name: "Daily Inventory Sync", schedule: "0 2 * * *", lastRun: "2025-01-15 02:00", nextRun: "2025-01-16 02:00", status: "success", enabled: true },
    { id: "2", name: "Weekly AP Aging Report", schedule: "0 9 * * 1", lastRun: "2025-01-13 09:00", nextRun: "2025-01-20 09:00", status: "success", enabled: true },
    { id: "3", name: "Hourly Quote Export", schedule: "0 * * * *", lastRun: "2025-01-15 14:00", nextRun: "2025-01-15 15:00", status: "running", enabled: true },
    { id: "4", name: "Monthly Archive", schedule: "0 0 1 * *", lastRun: "2025-01-01 00:00", nextRun: "2025-02-01 00:00", status: "failed", enabled: false },
  ]);

  const handleToggle = (id: string) => {
    setJobs(jobs.map(job => 
      job.id === id ? { ...job, enabled: !job.enabled } : job
    ));
  };

  const handleRunNow = (id: string) => {
    setJobs(jobs.map(job => 
      job.id === id ? { ...job, status: "running" as const } : job
    ));
    setTimeout(() => {
      setJobs(jobs.map(job => 
        job.id === id ? { ...job, status: "success" as const } : job
      ));
    }, 2000);
  };

  const statusMap = {
    success: { status: "success" as const, label: "SUCCESS", icon: CheckCircle },
    failed: { status: "error" as const, label: "FAILED", icon: XCircle },
    running: { status: "info" as const, label: "RUNNING", icon: RefreshCw },
  };

  const columns = [
    { key: "name", label: "Job Name" },
    { key: "schedule", label: "Schedule (Cron)" },
    { key: "lastRun", label: "Last Run" },
    { key: "nextRun", label: "Next Run" },
    { 
      key: "status", 
      label: "Status",
      render: (job: CronJob) => {
        const config = statusMap[job.status];
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={config.status} label={config.label} />
          </div>
        );
      }
    },
    {
      key: "enabled",
      label: "Enabled",
      render: (job: CronJob) => (
        <Switch
          checked={job.enabled}
          onCheckedChange={() => handleToggle(job.id)}
        />
      )
    },
    {
      key: "actions",
      label: "",
      render: (job: CronJob) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRunNow(job.id)}
          disabled={job.status === "running" || !job.enabled}
        >
          <Play className="h-4 w-4 mr-2" />
          Run Now
        </Button>
      )
    },
  ];

  const activeJobs = jobs.filter(j => j.enabled).length;
  const failedJobs = jobs.filter(j => j.status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Cron Jobs</h1>
        <p className="text-muted-foreground">Manage scheduled background tasks</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Active Jobs</p>
          <p className="text-2xl font-semibold">{activeJobs}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Jobs</p>
          <p className="text-2xl font-semibold">{jobs.length}</p>
        </Card>
        <Card className={`p-6 ${failedJobs > 0 ? "border-error/20" : ""}`}>
          <p className="text-sm text-muted-foreground mb-1">Failed</p>
          <p className={`text-2xl font-semibold ${failedJobs > 0 ? "text-error" : ""}`}>{failedJobs}</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={jobs}
        emptyMessage="No cron jobs configured"
      />
    </div>
  );
}
