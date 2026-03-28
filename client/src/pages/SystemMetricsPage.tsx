import { BackButton } from "@/components/common/BackButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Unknown";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

export default function SystemMetricsPage() {
  const { data, isLoading, error, refetch } = trpc.health.metrics.useQuery();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
        <p className="text-muted-foreground">
          Runtime health and resource usage for the current TERP instance.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading system metrics..." />
      ) : error ? (
        <Card className="p-6">
          <ErrorState
            title="Failed to load system metrics"
            description={
              error.message ||
              "An error occurred while loading runtime health data."
            }
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <CardDescription>Current process uptime</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatUptime(data?.uptime ?? 0)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Heap Used
                </CardTitle>
                <CardDescription>Active memory in use</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data?.memory.heapUsedMb ?? 0} MB
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Heap Total
                </CardTitle>
                <CardDescription>Allocated JS heap</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data?.memory.heapTotalMb ?? 0} MB
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">RSS</CardTitle>
                <CardDescription>Total resident memory</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data?.memory.rssMb ?? 0} MB
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>CPU Usage</CardTitle>
              <CardDescription>
                Cumulative process CPU timing since boot.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  User CPU
                </div>
                <div className="mt-2 text-xl font-semibold">
                  {data?.cpu.user?.toLocaleString() ?? "0"} μs
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  System CPU
                </div>
                <div className="mt-2 text-xl font-semibold">
                  {data?.cpu.system?.toLocaleString() ?? "0"} μs
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
