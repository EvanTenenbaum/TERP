import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { validateSalesDocument } from "@/lib/salesValidation";

interface DocumentValidatorProps {
  clientId: string;
  lines: Array<{ id: string; inventory_id: string; qty: number }>;
}

export function DocumentValidator({ clientId, lines }: DocumentValidatorProps) {
  const validation = validateSalesDocument(clientId, lines);

  if (validation.valid && validation.warnings.length === 0) {
    return (
      <Alert className="border-success">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          Document is valid and ready to submit.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, idx) => (
                <li key={idx} className="text-sm">
                  {error.field}: {error.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Warnings:</div>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">
                  {warning}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
