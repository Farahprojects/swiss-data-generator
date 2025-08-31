import { BaseTemplate } from './BaseTemplate';
import { PdfGenerationOptions, PdfMetadata } from '../types';
import { ReportParser, ParsedBlock } from '@/utils/reportParser';

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

    // Customer name
    this.doc.setFontSize(14).setFont('helvetica', 'normal');
    this.doc.text(`Generated for: ${data.customerName}`, this.pageWidth / 2, logoY + 40, { align: 'center' });

    let y = logoY + 55;

    // AI Report Section
    y = this.renderAIReportSection(data.reportContent, y);

    // Footer
    if (options.includeFooter !== false) {
      // Footer placeholder - no content by default
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

    // Reset font just in case
    doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(33);

    // Start directly with the report content

    const blocks = ReportParser.parseReport(reportContent);
    const lineHeight = 7;
    const maxWidth = pageWidth - margins.left - margins.right;
    const headingGap = 8;
    const actionIndent = 15;

    for (const block of blocks) {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margins.top;
      }

      switch (block.type) {
        case 'heading':
          if (currentY > margins.top + 20) currentY += headingGap;

          doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(58, 39, 96);
          const headingLines = doc.splitTextToSize(block.text, maxWidth);
          for (const line of headingLines) {
            if (currentY > pageHeight - 30) {
              doc.addPage();
              currentY = margins.top;
            }
            doc.text(line, margins.left, currentY);
            currentY += lineHeight + 1;
          }
          currentY += 3;
          break;

        case 'action':
          doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(60, 60, 60);
          const actionLines = doc.splitTextToSize(block.text, maxWidth - actionIndent);
          for (const line of actionLines) {
            if (currentY > pageHeight - 30) {
              doc.addPage();
              currentY = margins.top;
            }
            doc.text(line, margins.left + actionIndent, currentY);
            currentY += lineHeight;
          }
          currentY += 2;
          break;

        case 'tag':
          doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100, 100, 100);
          const tagLines = doc.splitTextToSize(block.text, maxWidth - actionIndent);
          for (const line of tagLines) {
            if (currentY > pageHeight - 30) {
              doc.addPage();
              currentY = margins.top;
            }
            doc.text(line, margins.left + actionIndent, currentY);
            currentY += lineHeight - 1;
          }
          break;

        case 'spacer':
          currentY += 4;
          break;

        default:
          doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(33);
          const normalLines = doc.splitTextToSize(block.text, maxWidth);
          for (const line of normalLines) {
            if (currentY > pageHeight - 30) {
              doc.addPage();
              currentY = margins.top;
            }
            doc.text(line, margins.left, currentY);
            currentY += lineHeight;
          }
          currentY += 4;
          break;
      }
    }

    return currentY + 20;
  }
}
