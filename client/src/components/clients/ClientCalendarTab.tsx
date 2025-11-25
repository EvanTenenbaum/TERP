import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import EventFormDialog from "@/components/calendar/EventFormDialog";

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface ClientCalendarTabProps {
  clientId: number;
}

export function ClientCalendarTab({ clientId }: ClientCalendarTabProps) {
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Fetch events for this client
  const { data: events, isLoading, refetch } = trpc.calendar.getEventsByClient.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  const handleCreateEvent = () => {
    setSelectedEventId(null);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    setEventDialogOpen(true);
  };

  const handleEventSaved = () => {
    setEventDialogOpen(false);
    setSelectedEventId(null);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      SCHEDULED: "default",
      IN_PROGRESS: "secondary",
      COMPLETED: "outline",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      LOW: "outline",
      MEDIUM: "default",
      HIGH: "secondary",
      URGENT: "destructive",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar Events
              </CardTitle>
              <CardDescription>
                Events and meetings linked to this client
              </CardDescription>
            </div>
            <Button onClick={handleCreateEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading events...
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events found for this client.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      {formatDate(event.startDate)}
                    </TableCell>
                    <TableCell>
                      {event.startTime
                        ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`
                        : "All day"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.eventType}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell>{getPriorityBadge(event.priority)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEvent(event.id)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EventFormDialog
        isOpen={eventDialogOpen}
        onClose={() => {
          setEventDialogOpen(false);
          setSelectedEventId(null);
        }}
        eventId={selectedEventId}
        initialClientId={clientId}
        onSaved={handleEventSaved}
      />
    </>
  );
}

