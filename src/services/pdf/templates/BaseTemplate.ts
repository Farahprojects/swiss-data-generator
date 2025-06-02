
import jsPDF from 'jspdf';
import { PdfMetadata, PdfGenerationOptions } from '../types';

export abstract class BaseTemplate {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margins: { top: number; right: number; bottom: number; left: number };
  
  constructor(options: PdfGenerationOptions = {}) {
    const format = options.format || 'a4';
    const orientation = options.orientation || 'portrait';
    
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
  }

  protected addHeader(title: string): void {
    if (!title) return;
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margins.left, this.margins.top);
    
    // Add a line under the header
    this.doc.setLineWidth(0.5);
    this.doc.line(
      this.margins.left, 
      this.margins.top + 5, 
      this.pageWidth - this.margins.right, 
      this.margins.top + 5
    );
  }

  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      
      // Page number
      const pageText = `Page ${i} of ${pageCount}`;
      this.doc.text(
        pageText, 
        this.pageWidth - this.margins.right - this.doc.getTextWidth(pageText), 
        this.pageHeight - 10
      );
      
      // Generation timestamp
      const timestamp = `Generated on ${new Date().toLocaleString()}`;
      this.doc.text(timestamp, this.margins.left, this.pageHeight - 10);
    }
  }

  protected addMetadataSection(metadata: Record<string, string>): number {
    let yPos = this.margins.top + 15;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${key}:`, this.margins.left, yPos);
        
        this.doc.setFont('helvetica', 'normal');
        const keyWidth = this.doc.getTextWidth(`${key}: `);
        this.doc.text(value, this.margins.left + keyWidth, yPos);
        
        yPos += 6;
      }
    });
    
    return yPos + 5; // Return next Y position
  }

  protected addContent(content: string, startY: number): void {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const lines = this.doc.splitTextToSize(
      content, 
      this.pageWidth - this.margins.left - this.margins.right
    );
    
    this.doc.text(lines, this.margins.left, startY);
  }

  protected setMetadata(metadata: PdfMetadata): void {
    this.doc.setProperties({
      title: metadata.title,
      subject: metadata.subject,
      author: metadata.author,
      creator: metadata.creator || 'PDF Generator Service',
      keywords: metadata.keywords?.join(', ')
    });
  }

  protected download(filename: string): void {
    this.doc.save(filename);
  }

  abstract generate(data: any, options?: PdfGenerationOptions): Promise<void>;
}
