/**
 * VendorRedirect Component
 * 
 * Handles redirects from deprecated /vendors/:id routes to /clients/:clientId
 * Maps legacy vendor IDs to client IDs via the supplier_profiles table.
 * 
 * @deprecated This component exists only for backward compatibility during migration.
 * Once all vendor links are updated, this can be removed.
 */
import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "../lib/trpc";

export function VendorRedirect() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // Query the vendor to get the mapped client ID
  const { data: vendorResponse, isLoading, error } = trpc.vendors.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id && !isNaN(Number(id)) }
  );

  useEffect(() => {
    if (isLoading) return;

    if (error || !vendorResponse) {
      // Vendor not found - redirect to suppliers list
      if (import.meta.env.DEV) {
        console.warn(`[VendorRedirect] Vendor ${id} not found, redirecting to suppliers list`);
      }
      setLocation("/clients?clientTypes=seller");
      return;
    }

    if (vendorResponse.success && vendorResponse.data) {
      const clientId = vendorResponse.data._clientId;

      if (clientId) {
        // Redirect to the client profile page
        if (import.meta.env.DEV) {
          console.info(`[VendorRedirect] Redirecting vendor ${id} to client ${clientId}`);
        }
        setLocation(`/clients/${clientId}`);
      } else {
        // Legacy vendor without client mapping - redirect to suppliers list
        if (import.meta.env.DEV) {
          console.warn(`[VendorRedirect] Vendor ${id} has no client mapping, redirecting to suppliers list`);
        }
        setLocation("/clients?clientTypes=seller");
      }
    } else {
      // Error response - redirect to suppliers list
      if (import.meta.env.DEV) {
        console.warn(`[VendorRedirect] Error fetching vendor ${id}, redirecting to suppliers list`);
      }
      setLocation("/clients?clientTypes=seller");
    }
  }, [id, vendorResponse, isLoading, error, setLocation]);

  // Show loading state while resolving redirect
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to supplier profile...</p>
      </div>
    </div>
  );
}

export default VendorRedirect;
