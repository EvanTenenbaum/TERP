import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { CreditLimitWidget } from "@/components/credit/CreditLimitWidget";
import { PurchasePatternsWidget } from "@/components/clients/PurchasePatternsWidget";
import { CommentWidget } from "@/components/comments/CommentWidget";

interface ClientOverviewTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  clientId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activities: any[];
}

export function ClientOverviewTab({ client, clientId, activities }: ClientOverviewTabProps) {
  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Credit Limit Widget (only for buyers) */}
      {client.isBuyer && (
        <CreditLimitWidget clientId={clientId} showAdjustControls={false} />
      )}

      {/* Purchase Patterns Widget (only for buyers) */}
      {client.isBuyer && <PurchasePatternsWidget clientId={clientId} />}

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                TERI Code
              </Label>
              <p className="text-base">{client.teriCode}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Name
              </Label>
              <p className="text-base">{client.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <p className="text-base">{client.email || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Phone
              </Label>
              <p className="text-base">{client.phone || "-"}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Address
              </Label>
              <p className="text-base">{client.address || "-"}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Tags
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {client.tags &&
                Array.isArray(client.tags) &&
                client.tags.length > 0 ? (
                  (client.tags as string[]).map((tag, idx) => (
                    <Badge key={idx} variant="outline">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No tags</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {activities.slice(0, 5).map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {activity.activityType.replace(/_/g, " ")}
                    </p>
                    <p className="text-muted-foreground">
                      by {activity.userName || "Unknown"} •{" "}
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No activity yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>
            Team notes and discussions about this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommentWidget
            commentableType="client"
            commentableId={clientId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
