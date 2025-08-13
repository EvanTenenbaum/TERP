import jsPDF from 'jspdf';
import { getVendorDisplayName } from '@/lib/vendorDisplay';

interface QuoteData {
  id: string;
  quoteNumber: string;
  createdAt: Date;
  validUntil?: Date | null;
  totalAmount: number;
  notes?: string | null;
  customer: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      sku: string;
      name: string;
      description?: string | null;
      unit: string;
    };
    batch: {
      batchNumber: string;
      vendor: {
        vendorCode: string;
        companyName: string;
      };
    };
    inventoryLot: {
      location: string;
    };
  }>;
}

export function generateQuotePDF(quote: QuoteData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Helper function to format currency (whole numbers)
  const formatCurrency = (amount: number) => `$${Math.round(amount / 100)}`;

  // Helper function to format date
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES QUOTE', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Quote number and date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quote #: ${quote.quoteNumber}`, margin, yPosition);
  doc.text(`Date: ${formatDate(quote.createdAt)}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 10;

  if (quote.validUntil) {
    doc.text(`Valid Until: ${formatDate(quote.validUntil)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;
  } else {
    yPosition += 10;
  }

  // Customer Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.customer.companyName, margin, yPosition);
  yPosition += 6;
  doc.text(quote.customer.contactName, margin, yPosition);
  yPosition += 6;
  doc.text(quote.customer.email, margin, yPosition);
  yPosition += 6;

  if (quote.customer.phone) {
    doc.text(quote.customer.phone, margin, yPosition);
    yPosition += 6;
  }

  if (quote.customer.address) {
    doc.text(quote.customer.address, margin, yPosition);
    yPosition += 6;
    
    const cityStateZip = [
      quote.customer.city,
      quote.customer.state,
      quote.customer.zipCode
    ].filter(Boolean).join(', ');
    
    if (cityStateZip) {
      doc.text(cityStateZip, margin, yPosition);
      yPosition += 6;
    }
  }

  yPosition += 10;

  // Items table header
  const tableStartY = yPosition;
  const colWidths = {
    sku: 25,
    description: 60,
    vendor: 25,
    location: 20,
    qty: 15,
    unit: 15,
    price: 20,
    total: 25
  };

  let xPosition = margin;

  // Table header background
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 8, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  doc.text('SKU', xPosition, yPosition + 4);
  xPosition += colWidths.sku;
  
  doc.text('Description', xPosition, yPosition + 4);
  xPosition += colWidths.description;
  
  doc.text('Vendor', xPosition, yPosition + 4);
  xPosition += colWidths.vendor;
  
  doc.text('Location', xPosition, yPosition + 4);
  xPosition += colWidths.location;
  
  doc.text('Qty', xPosition, yPosition + 4);
  xPosition += colWidths.qty;
  
  doc.text('Unit', xPosition, yPosition + 4);
  xPosition += colWidths.unit;
  
  doc.text('Price', xPosition, yPosition + 4);
  xPosition += colWidths.price;
  
  doc.text('Total', xPosition, yPosition + 4);

  yPosition += 12;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  quote.items.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    xPosition = margin;

    // Alternate row background
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 8, 'F');
    }

    // SKU
    doc.text(item.product.sku, xPosition, yPosition + 4);
    xPosition += colWidths.sku;

    // Description (truncate if too long)
    const description = item.product.name + (item.product.description ? ` - ${item.product.description}` : '');
    const truncatedDescription = description.length > 35 ? description.substring(0, 32) + '...' : description;
    doc.text(truncatedDescription, xPosition, yPosition + 4);
    xPosition += colWidths.description;

    // Vendor (use vendor code for masking)
    const vendorDisplay = getVendorDisplayName(item.batch.vendor);
    doc.text(vendorDisplay, xPosition, yPosition + 4);
    xPosition += colWidths.vendor;

    // Location
    doc.text(item.inventoryLot.location, xPosition, yPosition + 4);
    xPosition += colWidths.location;

    // Quantity
    doc.text(item.quantity.toString(), xPosition, yPosition + 4);
    xPosition += colWidths.qty;

    // Unit
    doc.text(item.product.unit, xPosition, yPosition + 4);
    xPosition += colWidths.unit;

    // Unit Price
    doc.text(formatCurrency(item.unitPrice), xPosition, yPosition + 4);
    xPosition += colWidths.price;

    // Total Price
    doc.text(formatCurrency(item.totalPrice), xPosition, yPosition + 4);

    yPosition += 10;
  });

  // Total section
  yPosition += 10;
  const totalSectionX = pageWidth - margin - 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Subtotal:', totalSectionX, yPosition);
  doc.text(formatCurrency(quote.totalAmount), totalSectionX + 40, yPosition, { align: 'right' });
  yPosition += 8;

  doc.setFontSize(14);
  doc.text('Total:', totalSectionX, yPosition);
  doc.text(formatCurrency(quote.totalAmount), totalSectionX + 40, yPosition, { align: 'right' });
  yPosition += 15;

  // Notes section
  if (quote.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Notes:', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Split notes into lines that fit the page width
    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - 2 * margin);
    noteLines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('This quote is valid until the date specified above. Prices and availability subject to change.', 
    pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export async function generateQuotePDFBuffer(quote: QuoteData): Promise<Buffer> {
  const doc = generateQuotePDF(quote);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

export function downloadQuotePDF(quote: QuoteData, filename?: string) {
  const doc = generateQuotePDF(quote);
  const fileName = filename || `quote-${quote.quoteNumber}.pdf`;
  doc.save(fileName);
}

