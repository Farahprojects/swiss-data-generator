
import { BaseTemplate } from './BaseTemplate';
import { ReportPdfData, PdfGenerationOptions, PdfMetadata } from '../types';

export class ReportTemplate extends BaseTemplate {
  async generate(data: ReportPdfData, options: PdfGenerationOptions = {}): Promise<void> {
    // Set PDF metadata
    const metadata: PdfMetadata = {
      title: data.title,
      subject: 'Generated Report',
      author: 'Report System',
      keywords: ['report', data.metadata.reportType].filter(Boolean)
    };
    this.setMetadata(metadata);

    // Add header if enabled
    if (options.includeHeader !== false) {
      this.addHeader(data.title);
    }

    // Add metadata section
    const metadataForPdf: Record<string, string> = {
      'Report ID': data.id.substring(0, 8),
      'Generated At': data.metadata.generatedAt,
      'Report Type': data.metadata.reportType || 'N/A',
      'Processing Time': data.metadata.processingTime || 'N/A',
      'Cost': data.metadata.cost || 'N/A',
      'Status': data.metadata.status?.toString() || 'N/A'
    };

    const contentStartY = this.addMetadataSection(metadataForPdf);

    // Add error section if present
    if (data.error) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(200, 0, 0); // Red color for error
      this.doc.text('Error:', this.margins.left, contentStartY);
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0); // Reset to black
      
      const errorLines = this.doc.splitTextToSize(
        data.error, 
        this.pageWidth - this.margins.left - this.margins.right
      );
      this.doc.text(errorLines, this.margins.left, contentStartY + 7);
      return; // Don't add content if there's an error
    }

    // Add content section
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Report Content:', this.margins.left, contentStartY);
    
    this.addContent(data.content, contentStartY + 10);

    // Add footer if enabled
    if (options.includeFooter !== false) {
      this.addFooter();
    }

    // Download the PDF
    const filename = `report-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(filename);
  }
}
