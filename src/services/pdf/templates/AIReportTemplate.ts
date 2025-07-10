import { BaseTemplate } from './BaseTemplate';
import { PdfGenerationOptions, PdfMetadata } from '../types';

export interface AIReportPdfData {
  reportContent: string;
  customerName: string;
  metadata?: {
    generatedAt: string;
    reportType?: string;
  };
}

export class AIReportTemplate extends BaseTemplate {
  async generate(data: AIReportPdfData, options: PdfGenerationOptions = {}): Promise<void> {
    const metadata: PdfMetadata = {
      title: 'AI Intelligence Report',
      subject: 'AI Generated Report',
      author: 'Therai AI',
      keywords: ['ai', 'intelligence', 'report']
    };
    this.setMetadata(metadata);

    // Header
    const logoY = 20;
    this.doc.setFontSize(26).setFont('times', 'normal').setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    this.doc.setFontSize(20).setFont('helvetica', 'bold');
    this.doc.text('AI Intelligence Report', this.pageWidth / 2, logoY + 28, { align: 'center' });

    // Customer name
    this.doc.setFontSize(14).setFont('helvetica', 'normal');
    this.doc.text(`Generated for: ${data.customerName}`, this.pageWidth / 2, logoY + 40, { align: 'center' });

    let y = logoY + 55;

    // AI Report Section
    y = this.renderAIReportSection(data.reportContent, y);

    // Footer
    if (options.includeFooter !== false) {
      this.doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(120);
      this.doc.text('www.theraiastro.com', this.pageWidth / 2, this.pageHeight - 15, { align: 'center' });
    }

    // Save
    const fname = `ai-report-${data.customerName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(fname);
  }

  public renderAIReportSection(reportContent: string, startY: number, targetDoc?: any): number {
    const doc = targetDoc || this.doc;
    const margins = this.margins;
    const pageWidth = targetDoc ? targetDoc.internal.pageSize.getWidth() : this.pageWidth;
    const pageHeight = targetDoc ? targetDoc.internal.pageSize.getHeight() : this.pageHeight;
    
    let currentY = startY;

    // Check if we need a new page
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = margins.top;
    }

    // Section Header
    doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(75, 63, 114);
    doc.text('AI Intelligence Report', margins.left, currentY);
    currentY += 15;

    // Clean HTML content to get plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportContent;
    const cleanText = tempDiv.textContent || tempDiv.innerText || '';

    // Split content into paragraphs and process
    const paragraphs = cleanText.split('\n').filter(p => p.trim());
    
    doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(33);
    const lineHeight = 7;
    const maxWidth = pageWidth - margins.left - margins.right;

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      // Check for headings (lines that are short and appear to be titles)
      if (paragraph.length < 100 && paragraph.includes(':')) {
        doc.setFont('helvetica', 'bold').setTextColor(40, 40, 60);
        const lines = doc.splitTextToSize(paragraph, maxWidth);
        for (const line of lines) {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = margins.top;
          }
          doc.text(line, margins.left, currentY);
          currentY += lineHeight;
        }
        doc.setFont('helvetica', 'normal').setTextColor(33);
        currentY += 5;
      } else {
        const lines = doc.splitTextToSize(paragraph, maxWidth);
        for (const line of lines) {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = margins.top;
          }
          doc.text(line, margins.left, currentY);
          currentY += lineHeight;
        }
        currentY += 10;
      }
    }

    return currentY + 20;
  }
}