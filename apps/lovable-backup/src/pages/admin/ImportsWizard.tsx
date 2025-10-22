import { useState } from "react";
import { Upload, FileText, CheckCircle, ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

type Step = "upload" | "map" | "validate" | "commit";

export default function ImportsWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const navigate = useNavigate();

  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Upload" },
    { id: "map", label: "Map Fields" },
    { id: "validate", label: "Validate" },
    { id: "commit", label: "Commit" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleCancel = () => {
    if (confirm("Discard import and return to dashboard?")) {
      navigate("/");
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Data Import</h1>
          <p className="text-muted-foreground">Import data from CSV or Excel files</p>
        </div>
        <Button variant="outline" onClick={handleCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 flex-1 ${index <= currentStepIndex ? "text-brand" : "text-muted-foreground"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                index < currentStepIndex ? "bg-brand border-brand" :
                index === currentStepIndex ? "border-brand" :
                "border-border"
              }`}>
                {index < currentStepIndex ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-full mx-2 ${index < currentStepIndex ? "bg-brand" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-8">
        {currentStep === "upload" && (
          <div className="space-y-6">
            <h3>Upload File</h3>
            <div className="border-2 border-dashed border-border rounded-md p-12 text-center hover:border-brand transition-fast cursor-pointer">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-2">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports CSV, XLSX (max 10MB)</p>
              <Input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFileName(e.target.files[0].name);
                  }
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
            {fileName && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>Selected: {fileName}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {currentStep === "map" && (
          <div className="space-y-6">
            <h3>Map Fields</h3>
            <p className="text-sm text-muted-foreground">Match CSV columns to database fields</p>
            <div className="space-y-4">
              {["SKU", "Description", "Quantity", "Location"].map((field) => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <Label>{field}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="col1">Column A</SelectItem>
                      <SelectItem value="col2">Column B</SelectItem>
                      <SelectItem value="col3">Column C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === "validate" && (
          <div className="space-y-6">
            <h3>Validation Results</h3>
            <Alert className="border-success/20">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>All 245 rows validated successfully</AlertDescription>
            </Alert>
            <div className="space-y-2">
              <p className="text-sm font-medium">Summary:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 245 rows to import</li>
                <li>• 0 errors found</li>
                <li>• 12 duplicates will be skipped</li>
              </ul>
            </div>
          </div>
        )}

        {currentStep === "commit" && (
          <div className="space-y-6 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <div>
              <h3 className="mb-2">Import Complete</h3>
              <p className="text-sm text-muted-foreground">Successfully imported 233 records</p>
            </div>
            <Button onClick={() => navigate("/")}>
              Return to Dashboard
            </Button>
          </div>
        )}
      </Card>

      {/* Navigation */}
      {currentStep !== "commit" && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext}>
            {currentStepIndex === steps.length - 2 ? "Commit" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
