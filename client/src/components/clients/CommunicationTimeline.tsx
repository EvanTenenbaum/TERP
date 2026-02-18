import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Mail, Calendar, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface CommunicationTimelineProps {
  clientId: number;
  onAddClick: () => void;
}

export function CommunicationTimeline({
  clientId,
  onAddClick,
}: CommunicationTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const { data: communications, isLoading } =
    trpc.clients.communications.list.useQuery({
      clientId,
      type:
        typeFilter === "ALL"
          ? undefined
          : (typeFilter as "CALL" | "EMAIL" | "NOTE" | "MEETING"),
    });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "CALL":
        return <Phone className="h-4 w-4" />;
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "MEETING":
        return <Calendar className="h-4 w-4" />;
      case "NOTE":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      CALL: {
        label: "Call",
        className: "bg-blue-100 text-blue-800 border-blue-300",
      },
      EMAIL: {
        label: "Email",
        className: "bg-purple-100 text-purple-800 border-purple-300",
      },
      MEETING: {
        label: "Meeting",
        className: "bg-green-100 text-green-800 border-green-300",
      },
      NOTE: {
        label: "Note",
        className: "bg-gray-100 text-gray-800 border-gray-300",
      },
    };

    const { label, className } = config[type] || config.NOTE;

    return (
      <Badge
        variant="outline"
        className={`${className} flex items-center gap-1 w-fit`}
      >
        {getTypeIcon(type)}
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Loading communications...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Communication History</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CALL">Calls</SelectItem>
                <SelectItem value="EMAIL">Emails</SelectItem>
                <SelectItem value="MEETING">Meetings</SelectItem>
                <SelectItem value="NOTE">Notes</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onAddClick} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!communications || communications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No communications logged yet</p>
            <Button
              onClick={onAddClick}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log First Communication
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {communications.map(comm => (
              <div
                key={comm.id}
                className="relative pl-8 pb-4 border-l-2 border-muted last:border-l-0 last:pb-0"
              >
                {/* Timeline dot */}
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                {/* Communication content */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeBadge(comm.communicationType)}
                        <span className="text-sm text-muted-foreground">
                          {comm.communicatedAt
                            ? format(
                                new Date(comm.communicatedAt),
                                "MMM d, yyyy h:mm a"
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <h4 className="font-semibold">{comm.subject}</h4>
                      {comm.notes && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {comm.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Logged by {comm.loggedByName || "Unknown"} on{" "}
                    {comm.createdAt
                      ? format(new Date(comm.createdAt), "MMM d, yyyy h:mm a")
                      : "N/A"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
