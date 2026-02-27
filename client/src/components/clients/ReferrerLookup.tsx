/**
 * Sprint 4 Track B - 4.B.5: MEET-013 - Referrer Lookup
 *
 * Components for referrer lookup functionality:
 * - Search clients by referrer
 * - Referral tree visualization
 * - Referral stats: how many referred
 * - Top referrers report
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  TrendingUp,
  ChevronRight,
  User,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

interface ReferrerLookupProps {
  onSelectClient?: (clientId: number) => void;
}

/**
 * ReferrerLookup - Search and view clients by referrer
 */
export function ReferrerLookup({ onSelectClient }: ReferrerLookupProps) {
  const [search, setSearch] = useState("");
  const [selectedReferrerId, setSelectedReferrerId] = useState<number | null>(
    null
  );
  const [, setLocation] = useLocation();

  // Search by referrer
  const { data: searchResults, isLoading: searchLoading } =
    trpc.client360.searchByReferrer.useQuery(
      { referrerSearch: search },
      { enabled: search.length >= 2 }
    );

  // Get referrals for selected referrer
  const { data: referralsData, isLoading: referralsLoading } =
    trpc.client360.getClientReferrals.useQuery(
      { referrerClientId: selectedReferrerId ?? 0 },
      { enabled: !!selectedReferrerId }
    );

  // Format currency
  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Referrer Lookup
        </CardTitle>
        <CardDescription>Search for clients by their referrer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by referrer name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search Results */}
        {search.length >= 2 && (
          <div className="space-y-4">
            {searchLoading ? (
              <Skeleton className="h-48" />
            ) : searchResults?.clients && searchResults.clients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Referred By</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.clients.map(client => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{client.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({client.teriCode})
                          </span>
                        </div>
                        {client.email && (
                          <p className="text-sm text-muted-foreground">
                            {client.email}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="h-auto p-0"
                          onClick={() =>
                            setSelectedReferrerId(client.referredByClientId)
                          }
                        >
                          View referrer
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(client.totalSpent)}
                      </TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (onSelectClient) {
                              onSelectClient(client.id);
                            } else {
                              setLocation(`/clients/${client.id}`);
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No clients found with matching referrer</p>
              </div>
            )}
          </div>
        )}

        {search.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Enter at least 2 characters to search
          </p>
        )}

        {/* Referrer Details Dialog */}
        <Dialog
          open={!!selectedReferrerId}
          onOpenChange={() => setSelectedReferrerId(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Referrer Details</DialogTitle>
              <DialogDescription>
                Clients referred by this referrer
              </DialogDescription>
            </DialogHeader>
            {referralsLoading ? (
              <Skeleton className="h-48" />
            ) : referralsData?.referrals &&
              referralsData.referrals.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralsData.referrals.map(referral => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <span className="font-medium">{referral.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({referral.teriCode})
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {referral.isBuyer && (
                              <Badge variant="outline">Buyer</Badge>
                            )}
                            {referral.isSeller && (
                              <Badge variant="secondary">Supplier</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(referral.totalSpent)}
                        </TableCell>
                        <TableCell>{formatDate(referral.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals found</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/**
 * ReferralStatsCard - Display referral statistics and top referrers
 */
export function ReferralStatsCard() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.client360.getReferralStats.useQuery({
    limit: 10,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load referral stats</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Referral Statistics
        </CardTitle>
        <CardDescription>Top referrers and referral metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold">
              {data?.totalClientsWithReferrer || 0}
            </p>
            <p className="text-sm text-muted-foreground">Clients Referred</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold">{data?.uniqueReferrers || 0}</p>
            <p className="text-sm text-muted-foreground">Active Referrers</p>
          </div>
        </div>

        {/* Top Referrers */}
        <div>
          <h4 className="font-medium mb-3">Top Referrers</h4>
          {data?.topReferrers && data.topReferrers.length > 0 ? (
            <div className="space-y-2">
              {data.topReferrers.map((referrer, idx) => (
                <div
                  key={referrer.referrerId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setLocation(`/clients/${referrer.referrerId}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {referrer.referrerName || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {referrer.referrerCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {referrer.referralCount} referrals
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No referrers found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ReferralTreeView - Visual representation of referral chain
 */
interface ReferralTreeViewProps {
  clientId: number;
}

export function ReferralTreeView({ clientId }: ReferralTreeViewProps) {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = trpc.client360.getReferralTree.useQuery({
    clientId,
    maxDepth: 5,
  });

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (error) {
    return (
      <div className="text-center py-4 text-destructive">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Failed to load referral tree</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upward Chain (who referred this client) */}
      {data?.upwardChain && data.upwardChain.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Referred By Chain
          </h4>
          <div className="space-y-1">
            {data.upwardChain.map((referrer, idx) => (
              <div
                key={referrer.id}
                className="flex items-center gap-2"
                style={{ paddingLeft: `${idx * 16}px` }}
              >
                {idx > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2"
                  onClick={() => setLocation(`/clients/${referrer.id}`)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {referrer.name} ({referrer.teriCode})
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Referrals (who this client referred) */}
      {data?.directReferrals && data.directReferrals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Direct Referrals ({data.directReferrals.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.directReferrals.map(referral => (
              <Button
                key={referral.id}
                variant="outline"
                className="justify-start h-auto py-2"
                onClick={() => setLocation(`/clients/${referral.id}`)}
              >
                <User className="h-4 w-4 mr-2" />
                <span className="truncate">{referral.name}</span>
                <span className="text-muted-foreground ml-2">
                  ({referral.teriCode})
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {(!data?.upwardChain || data.upwardChain.length === 0) &&
        (!data?.directReferrals || data.directReferrals.length === 0) && (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No referral connections found</p>
          </div>
        )}
    </div>
  );
}

export default ReferrerLookup;
