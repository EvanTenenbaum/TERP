import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormModal } from "@/components/common/FormModal";
import { toast } from "sonner";
import { mockClients } from "@/lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewClientModal({ open, onOpenChange, onSuccess }: NewClientModalProps) {
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("50000");

  const handleSubmit = () => {
    if (!name || !license || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Audit: create_client action
    toast.success("Client added");
    
    // Reset form
    setName("");
    setLicense("");
    setEmail("");
    setPhone("");
    setCreditLimit("50000");
    
    onSuccess();
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Client"
      description="Add a new client account"
      onSubmit={handleSubmit}
      onCancel={() => onOpenChange(false)}
      submitLabel="Create Client"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="license">License Number *</Label>
          <Input
            id="license"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="LIC-CA-12345"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@client.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="creditLimit">Credit Limit</Label>
          <Input
            id="creditLimit"
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="50000"
          />
        </div>
      </div>
    </FormModal>
  );
}

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function AddNoteModal({ open, onOpenChange, clientId }: AddNoteModalProps) {
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }

    // Audit: add_client_note action
    toast.success("Note added");
    setNote("");
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Note"
      description={`Add a note for client ${clientId}`}
      onSubmit={handleSubmit}
      onCancel={() => onOpenChange(false)}
      submitLabel="Add Note"
    >
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter note..."
        />
      </div>
    </FormModal>
  );
}

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  billId?: string;
  maxAmount: number;
}

export function RecordPaymentModal({ 
  open, 
  onOpenChange, 
  invoiceId, 
  billId,
  maxAmount 
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const handleSubmit = () => {
    if (!amount || !method) {
      toast.error("Please fill in all required fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0 || numAmount > maxAmount) {
      toast.error(`Amount must be between $0 and $${maxAmount.toFixed(2)}`);
      return;
    }

    // Audit: record_payment action
    toast.success("Payment recorded");
    
    setAmount("");
    setMethod("");
    setReference("");
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description={`Record payment for ${invoiceId || billId}`}
      onSubmit={handleSubmit}
      onCancel={() => onOpenChange(false)}
      submitLabel="Record Payment"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount * (Max: ${maxAmount.toFixed(2)})</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="method">Payment Method *</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger id="method">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="wire">Wire Transfer</SelectItem>
              <SelectItem value="ach">ACH</SelectItem>
              <SelectItem value="card">Credit Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reference">Reference #</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Check #, Transaction ID, etc."
          />
        </div>
      </div>
    </FormModal>
  );
}

interface NewBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewBatchModal({ open, onOpenChange, onSuccess }: NewBatchModalProps) {
  const [inventoryId, setInventoryId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleSubmit = () => {
    if (!inventoryId || !vendorId || !lotNumber || !receivedDate || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Audit: create_batch action
    toast.success("Batch created");
    
    // Reset form
    setInventoryId("");
    setVendorId("");
    setLotNumber("");
    setReceivedDate("");
    setExpirationDate("");
    setQuantity("");
    
    onSuccess();
    onOpenChange(false);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Batch"
      description="Create a new inventory batch"
      onSubmit={handleSubmit}
      onCancel={() => onOpenChange(false)}
      submitLabel="Create Batch"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inventoryId">Inventory Item *</Label>
          <Select value={inventoryId} onValueChange={setInventoryId}>
            <SelectTrigger id="inventoryId">
              <SelectValue placeholder="Select or create new" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">+ Create New Item</SelectItem>
              <SelectItem value="INV-001">Blue Dream THCA</SelectItem>
              <SelectItem value="INV-002">OG Kush THCA</SelectItem>
              <SelectItem value="INV-003">Gelato THCA Diamonds</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="vendorId">Vendor *</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger id="vendorId">
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="V-001">THCA Farms Inc.</SelectItem>
              <SelectItem value="V-002">Premium Genetics Supply</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lotNumber">Lot Number *</Label>
          <Input
            id="lotNumber"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="LOT-2025-001"
          />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="receivedDate">Received Date *</Label>
            <Input
              id="receivedDate"
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="quantity">Initial Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
    </FormModal>
  );
}
