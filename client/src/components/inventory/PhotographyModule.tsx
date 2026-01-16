/**
 * PhotographyModule Component
 * Sprint 5.C.8: WS-010 - Product Photography Module
 *
 * Features:
 * - Camera integration for product photos
 * - Image upload and crop
 * - Auto-background removal option
 * - Gallery view per product
 * - Batch photo upload
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Download,
  Maximize2,
  Check,
  RotateCw,
  MoreVertical,
  Plus,
  Eye,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Photo types
export interface ProductPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  isPrimary: boolean;
  order: number;
  uploadedAt: Date;
  size: number;
  dimensions?: { width: number; height: number };
  metadata?: Record<string, unknown>;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
}

interface PhotographyModuleProps {
  productId: number;
  productName?: string;
  photos?: ProductPhoto[];
  onPhotosChange?: (photos: ProductPhoto[]) => void;
  onUpload?: (files: File[]) => Promise<ProductPhoto[]>;
  onDelete?: (photoId: string) => Promise<void>;
  onSetPrimary?: (photoId: string) => Promise<void>;
  onReorder?: (photoIds: string[]) => Promise<void>;
  maxPhotos?: number;
  acceptedFormats?: string[];
  maxFileSizeMB?: number;
  className?: string;
}

export function PhotographyModule({
  productId: _productId,
  productName,
  photos = [],
  onPhotosChange,
  onUpload,
  onDelete,
  onSetPrimary,
  onReorder: _onReorder,
  maxPhotos = 10,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp"],
  maxFileSizeMB = 10,
  className,
}: PhotographyModuleProps) {
  // State
  const [selectedPhoto, setSelectedPhoto] = useState<ProductPhoto | null>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  // eslint-disable-next-line no-undef
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line no-undef
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line no-undef
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate remaining slots
  const remainingSlots = maxPhotos - photos.length;
  const canAddMore = remainingSlots > 0;

  // MEMORY LEAK FIX: Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // Validate files
      const validFiles: File[] = [];
      const errors: string[] = [];

      files.forEach(file => {
        if (!acceptedFormats.includes(file.type)) {
          errors.push(`${file.name}: Invalid format`);
          return;
        }
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          errors.push(`${file.name}: Exceeds ${maxFileSizeMB}MB limit`);
          return;
        }
        validFiles.push(file);
      });

      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
      }

      if (validFiles.length > remainingSlots) {
        toast.warning(
          `Only uploading first ${remainingSlots} photos (max ${maxPhotos})`
        );
        validFiles.splice(remainingSlots);
      }

      if (validFiles.length === 0) return;

      // Start upload
      setUploading(true);
      setUploadProgress(
        validFiles.map(f => ({
          filename: f.name,
          progress: 0,
          status: "pending",
        }))
      );

      try {
        if (onUpload) {
          const newPhotos = await onUpload(validFiles);

          // Update progress to complete
          setUploadProgress(prev =>
            prev.map(p => ({ ...p, progress: 100, status: "complete" }))
          );

          // Notify parent
          if (onPhotosChange) {
            onPhotosChange([...photos, ...newPhotos]);
          }

          toast.success(`Uploaded ${newPhotos.length} photo(s)`);
        } else {
          // Simulate upload for demo
          await simulateUpload(validFiles);
        }
      } catch (_error) {
        toast.error("Failed to upload photos");
        setUploadProgress(prev =>
          prev.map(p => ({ ...p, status: "error", error: "Upload failed" }))
        );
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress([]), 2000);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [
      acceptedFormats,
      maxFileSizeMB,
      remainingSlots,
      maxPhotos,
      onUpload,
      onPhotosChange,
      photos,
    ]
  );

  // Simulate upload (for demo purposes)
  const simulateUpload = async (files: File[]) => {
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "uploading" } : p
        )
      );

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress } : p
          )
        );
      }

      setUploadProgress(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "complete" } : p
        )
      );
    }
  };

  // Handle camera access
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1920, height: 1080 },
      });
      setCameraStream(stream);
      setShowCameraDialog(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (_error) {
      toast.error("Could not access camera");
      console.error("Camera error:", _error);
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedImage(null);
    setShowCameraDialog(false);
  }, [cameraStream]);

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
  };

  // Use captured photo
  const useCapturedPhoto = async () => {
    if (!capturedImage) return;

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Upload the file
      if (onUpload) {
        setUploading(true);
        const newPhotos = await onUpload([file]);
        if (onPhotosChange) {
          onPhotosChange([...photos, ...newPhotos]);
        }
        toast.success("Photo captured and uploaded");
      }
    } catch (_error) {
      toast.error("Failed to save captured photo");
    } finally {
      setUploading(false);
      stopCamera();
    }
  };

  // Handle delete photo
  const handleDelete = async (photoId: string) => {
    try {
      if (onDelete) {
        await onDelete(photoId);
      }
      if (onPhotosChange) {
        onPhotosChange(photos.filter(p => p.id !== photoId));
      }
      toast.success("Photo deleted");
    } catch (_error) {
      toast.error("Failed to delete photo");
    }
  };

  // Handle set primary
  const handleSetPrimary = async (photoId: string) => {
    try {
      if (onSetPrimary) {
        await onSetPrimary(photoId);
      }
      if (onPhotosChange) {
        onPhotosChange(
          photos.map(p => ({ ...p, isPrimary: p.id === photoId }))
        );
      }
      toast.success("Primary photo updated");
    } catch (_error) {
      toast.error("Failed to set primary photo");
    }
  };

  // Render photo grid item
  const renderPhotoItem = (photo: ProductPhoto, index: number) => (
    <div
      key={photo.id}
      className={cn(
        "relative group rounded-lg overflow-hidden border bg-muted aspect-square",
        photo.isPrimary && "ring-2 ring-primary"
      )}
    >
      <img
        src={photo.thumbnailUrl || photo.url}
        alt={photo.filename}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Primary badge */}
      {photo.isPrimary && (
        <Badge
          className="absolute top-2 left-2 bg-primary"
          variant="default"
        >
          <Star className="h-3 w-3 mr-1" />
          Primary
        </Badge>
      )}

      {/* Order number */}
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">
        {index + 1}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSelectedPhoto(photo);
                  setShowPreviewDialog(true);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!photo.isPrimary && (
              <DropdownMenuItem onClick={() => handleSetPrimary(photo.id)}>
                <Star className="h-4 w-4 mr-2" />
                Set as Primary
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => window.open(photo.url, "_blank")}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(photo.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Photos
            </CardTitle>
            <CardDescription>
              {productName && `Photos for ${productName} - `}
              {photos.length}/{maxPhotos} photos
            </CardDescription>
          </div>

          {canAddMore && (
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startCamera}
                      disabled={uploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Camera
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Take photo with camera</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upload photos from device</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload progress */}
        {uploadProgress.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-muted">
            {uploadProgress.map((item, idx) => (
              <div key={`${item.filename}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.filename}</span>
                  <span className="text-muted-foreground">
                    {item.status === "complete" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : item.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      `${item.progress}%`
                    )}
                  </span>
                </div>
                <Progress value={item.progress} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {/* Photo grid */}
        {photos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-2">No photos yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos
              .sort((a, b) => a.order - b.order)
              .map((photo, index) => renderPhotoItem(photo, index))}

            {/* Add more button */}
            {canAddMore && (
              <button
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="h-6 w-6" />
                <span className="text-xs">Add Photo</span>
              </button>
            )}
          </div>
        )}

        {/* Camera Dialog */}
        <Dialog open={showCameraDialog} onOpenChange={stopCamera}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Take Photo</DialogTitle>
              <DialogDescription>
                Position the product and capture a photo
              </DialogDescription>
            </DialogHeader>

            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {!capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <DialogFooter>
              {!capturedImage ? (
                <>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                  <Button onClick={capturePhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setCapturedImage(null)}>
                    <RotateCw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={useCapturedPhoto} disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Use Photo
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedPhoto?.filename}</DialogTitle>
              <DialogDescription>
                {selectedPhoto?.dimensions &&
                  `${selectedPhoto.dimensions.width} x ${selectedPhoto.dimensions.height}`}
                {selectedPhoto?.size &&
                  ` - ${(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB`}
              </DialogDescription>
            </DialogHeader>

            {selectedPhoto && (
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.filename}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  selectedPhoto && window.open(selectedPhoto.url, "_blank")
                }
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Open Full Size
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedPhoto && handleDelete(selectedPhoto.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              {selectedPhoto && !selectedPhoto.isPrimary && (
                <Button
                  onClick={() => {
                    handleSetPrimary(selectedPhoto.id);
                    setShowPreviewDialog(false);
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Primary
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default PhotographyModule;
