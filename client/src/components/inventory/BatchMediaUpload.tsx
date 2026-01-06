/**
 * BatchMediaUpload - Upload and manage media for batches
 * Part of QA-069: Batch Media Upload
 */

import React, { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Star,
  X,
} from "lucide-react";

interface BatchMediaUploadProps {
  batchId: number;
  productId?: number;
}

interface ImageData {
  id: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  isPrimary: boolean | null;
  sortOrder: number | null;
  status: "PENDING" | "APPROVED" | "ARCHIVED" | "REJECTED" | null;
  uploadedAt: Date | null;
  uploadedByName: string | null;
}

export const BatchMediaUpload = React.memo(function BatchMediaUpload({
  batchId,
  productId,
}: BatchMediaUploadProps): React.ReactElement {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Query for existing images
  const { data: images, isLoading } = trpc.photography.getBatchImages.useQuery(
    { batchId },
    { enabled: Boolean(batchId) }
  );

  // Upload mutation (uses inventory.uploadMedia for file upload)
  const uploadFileMutation = trpc.inventory.uploadMedia.useMutation();

  // Save image reference mutation
  const saveImageMutation = trpc.photography.upload.useMutation({
    onSuccess: () => {
      utils.photography.getBatchImages.invalidate({ batchId });
      toast({
        title: "Image uploaded",
        description: "The image has been uploaded successfully.",
      });
      resetUploadForm();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to save image",
        variant: "destructive",
      });
    },
  });

  // Update image mutation
  const updateImageMutation = trpc.photography.update.useMutation({
    onSuccess: () => {
      utils.photography.getBatchImages.invalidate({ batchId });
      toast({
        title: "Image updated",
        description: "The image has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update image",
        variant: "destructive",
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = trpc.photography.delete.useMutation({
    onSuccess: () => {
      utils.photography.getBatchImages.invalidate({ batchId });
      toast({
        title: "Image deleted",
        description: "The image has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const resetUploadForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setUploadDialogOpen(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const base64Data = await base64Promise;

      // Upload file to storage
      const uploadResult = await uploadFileMutation.mutateAsync({
        fileData: base64Data,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        batchId,
      });

      // Save image reference
      await saveImageMutation.mutateAsync({
        batchId,
        productId,
        imageUrl: uploadResult.url,
        caption: caption || undefined,
        isPrimary: !images || images.length === 0,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    selectedFile,
    batchId,
    productId,
    caption,
    images,
    uploadFileMutation,
    saveImageMutation,
    toast,
  ]);

  const handleSetPrimary = useCallback(
    (imageId: number) => {
      updateImageMutation.mutate({ imageId, isPrimary: true });
    },
    [updateImageMutation]
  );

  const handleDelete = useCallback(
    (imageId: number) => {
      if (window.confirm("Are you sure you want to delete this image?")) {
        deleteImageMutation.mutate({ imageId });
      }
    },
    [deleteImageMutation]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Batch Media
            </CardTitle>
            <CardDescription>
              Upload and manage images for this batch
            </CardDescription>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image: ImageData) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={image.caption || "Batch image"}
                  className="w-full aspect-square object-cover cursor-pointer"
                  onClick={() => setLightboxImage(image.imageUrl)}
                />
                {image.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Primary
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.isPrimary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetPrimary(image.id)}
                      disabled={updateImageMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                    disabled={deleteImageMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 truncate">
                    {image.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No images uploaded yet</p>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload First Image
            </Button>
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Select an image to upload for this batch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="image">Image File</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>

            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                placeholder="Enter a caption for this image"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadForm}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxImage && (
        <Dialog open={true} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="w-full sm:max-w-4xl">
            <img
              src={lightboxImage}
              alt="Full size"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
});
