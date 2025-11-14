import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Warehouse, MapPin } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

interface Location {
  id: number;
  site: string;
  zone: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function LocationsPage() {
  const [limit] = useState(100);
  const [offset] = useState(0);

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations", { limit, offset }],
    queryFn: () => trpc.locations.getAll.query({ limit, offset }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8" />
            Warehouse Locations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse locations and inventory placement
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : locations && locations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: Location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.site}
                    </TableCell>
                    <TableCell>{location.zone || "-"}</TableCell>
                    <TableCell>{location.rack || "-"}</TableCell>
                    <TableCell>{location.shelf || "-"}</TableCell>
                    <TableCell>{location.bin || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          location.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {location.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No locations found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
