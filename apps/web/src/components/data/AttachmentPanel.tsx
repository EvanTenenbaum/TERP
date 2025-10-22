'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  entityType: string;
  entityId: string;
}

interface AttachmentPanelProps {
  entityType: string;
  entityId: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
}

export function AttachmentPanel({
  entityType,
  entityId,
  allowUpload = true,
  allowDelete = false,
}: AttachmentPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [entityType, entityId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/attachments/list?entityType=${entityType}&entityId=${entityId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      
      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Refresh attachments list
      await fetchAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/attachments/file?id=${attachmentId}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/attachments/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: attachmentId }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Refresh attachments list
      await fetchAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} retry={fetchAttachments} />;
  }

  return (
    <div className="space-y-4">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-c-ink">
          Attachments ({attachments.length})
        </h3>
        {allowUpload && (
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="primary" disabled={uploading}>
              {uploading ? 'Uploading...' : '+ Upload'}
            </Button>
          </label>
        )}
      </div>

      {/* Attachments list */}
      {attachments.length === 0 ? (
        <EmptyState
          title="No attachments"
          description="Upload files to attach them to this record"
        />
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-4 bg-c-panel border border-c-border rounded-lg hover:border-c-brand transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-c-ink truncate">
                    {attachment.filename}
                  </span>
                  <Badge variant="default">
                    {formatFileSize(attachment.sizeBytes)}
                  </Badge>
                </div>
                <div className="text-sm text-c-mid mt-1">
                  Uploaded by {attachment.uploadedBy} on{' '}
                  {formatDate(attachment.uploadedAt)}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  onClick={() => handleDownload(attachment.id, attachment.filename)}
                >
                  Download
                </Button>
                {allowDelete && (
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(attachment.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
