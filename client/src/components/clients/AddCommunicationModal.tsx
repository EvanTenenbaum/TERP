import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Phone, Mail, Calendar, FileText } from 'lucide-react';

interface AddCommunicationModalProps {
  clientId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCommunicationModal({
  clientId,
  open,
  onOpenChange,
  onSuccess,
}: AddCommunicationModalProps) {
  const [type, setType] = useState<'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'>('NOTE');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [communicatedAt, setCommunicatedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );

  const addCommunication = trpc.clients.communications.add.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    try {
      await addCommunication.mutateAsync({
        clientId,
        type,
        subject: subject.trim(),
        notes: notes.trim() || undefined,
        communicatedAt,
      });

      toast.success('Communication logged successfully');
      
      // Reset form
      setType('NOTE');
      setSubject('');
      setNotes('');
      setCommunicatedAt(new Date().toISOString().slice(0, 16));
      
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to log communication';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Communication Type</Label>
            <Select value={type} onValueChange={(value: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE') => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Call
                  </div>
                </SelectItem>
                <SelectItem value="EMAIL">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="MEETING">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Meeting
                  </div>
                </SelectItem>
                <SelectItem value="NOTE">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Note
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="communicatedAt">Date & Time</Label>
            <Input
              id="communicatedAt"
              type="datetime-local"
              value={communicatedAt}
              onChange={(e) => setCommunicatedAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the communication"
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detailed notes about the communication..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addCommunication.isPending}>
              {addCommunication.isPending ? 'Saving...' : 'Save Communication'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

