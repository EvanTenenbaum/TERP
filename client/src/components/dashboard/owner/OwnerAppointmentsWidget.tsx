import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AppointmentStatus = "pending" | "approved" | "rejected" | "cancelled";

function getStatusBadgeClass(status: AppointmentStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "pending":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-800";
    case "cancelled":
      return "border-gray-300 bg-gray-50 text-gray-600";
    default:
      return "border-gray-300 bg-gray-50 text-gray-600";
  }
}

function formatAppointmentTime(slot: Date | string): string {
  const date = slot instanceof Date ? slot : new Date(slot);
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const OwnerAppointmentsWidget = memo(function OwnerAppointmentsWidget() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.appointmentRequests.list.useQuery(
    { limit: 20, offset: 0 },
    { refetchInterval: 60000 }
  );

  // Filter to upcoming appointments: today through next 7 days
  // Only show pending and approved (not rejected or cancelled)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Set now to start of today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingAppointments =
    data?.requests.filter(req => {
      if (req.status === "rejected" || req.status === "cancelled") return false;
      const slot =
        req.requestedSlot instanceof Date
          ? req.requestedSlot
          : new Date(req.requestedSlot);
      return slot >= todayStart && slot <= sevenDaysFromNow;
    }) ?? [];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="calendar"
            size="sm"
            title="Unable to load appointments"
            description="Appointment data could not be loaded"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Today &amp; next 7 days
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/calendar")}
          className="text-xs shrink-0"
        >
          View all <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <EmptyState
            variant="calendar"
            size="sm"
            title="No upcoming appointments"
            description="No appointments scheduled for the next 7 days"
          />
        ) : (
          <ol className="space-y-2">
            {upcomingAppointments.map(appt => (
              <li
                key={appt.id}
                className="rounded border bg-muted/30 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {appt.clientName ?? "Unknown client"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatAppointmentTime(appt.requestedSlot)}
                    </p>
                    {appt.appointmentTypeName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.appointmentTypeName}
                        {appt.appointmentTypeDuration
                          ? ` · ${appt.appointmentTypeDuration} min`
                          : ""}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeClass(
                      appt.status as AppointmentStatus
                    )}
                  >
                    {appt.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
});
