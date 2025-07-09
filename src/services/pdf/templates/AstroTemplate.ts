import { BaseTemplate } from './BaseTemplate';
import { PdfGenerationOptions, PdfMetadata } from '../types';
import { isSynastryData } from '@/lib/synastryFormatter';

export interface AstroPdfData {
  id: string;
  title: string;
  customerName: string;
  swissData: any;
  metadata: {
    generatedAt: string;
    reportType?: string;
  };
}

export class AstroTemplate extends BaseTemplate {
  async generate(data: AstroPdfData, options: PdfGenerationOptions = {}): Promise<void> {
    const metadata: PdfMetadata = {
      title: 'Astro Data Report',
      subject: 'Astronomical Data',
      author: 'Therai Astro',
      keywords: ['astrology', 'astronomical data', 'chart']
    };
    this.setMetadata(metadata);

    // Header
    const logoY = 20;
    this.doc.setFontSize(26).setFont('times', 'bold').setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    this.doc.setFontSize(20).setFont('helvetica', 'bold');
    this.doc.text('Astro Data Report', this.pageWidth / 2, logoY + 28, { align: 'center' });

    // Customer name
    this.doc.setFontSize(14).setFont('helvetica', 'normal');
    this.doc.text(`Generated for: ${data.customerName}`, this.pageWidth / 2, logoY + 40, { align: 'center' });

    let y = logoY + 55;

    if (isSynastryData(data.swissData)) {
      this.renderSynastryData(data.swissData, y);
    } else {
      this.renderEssenceData(data.swissData, y);
    }

    // Footer
    if (options.includeFooter !== false) {
      this.doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(120);
      this.doc.text('www.theraiastro.com', this.pageWidth / 2, this.pageHeight - 15, { align: 'center' });
    }

    // Save
    const fname = `astro-data-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(fname);
  }

  private renderSynastryData(swissData: any, startY: number): void {
    let y = startY;
    this.doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    this.doc.text('Compatibility Astro Data', this.margins.left, y);
    y += 20;

    // Add simple text representation of the data
    this.doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(33);
    const dataText = JSON.stringify(swissData, null, 2);
    const lines = this.doc.splitTextToSize(dataText, this.pageWidth - this.margins.left - this.margins.right);
    
    lines.forEach((line: string) => {
      if (y > this.pageHeight - 30) {
        this.doc.addPage();
        y = this.margins.top;
      }
      this.doc.text(line, this.margins.left, y);
      y += 5;
    });
  }

  private renderEssenceData(swissData: any, startY: number): void {
    let y = startY;
    this.doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    this.doc.text('Personal Astro Data', this.margins.left, y);
    y += 20;

    // Add simple text representation of the data
    this.doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(33);
    const dataText = JSON.stringify(swissData, null, 2);
    const lines = this.doc.splitTextToSize(dataText, this.pageWidth - this.margins.left - this.margins.right);
    
    lines.forEach((line: string) => {
      if (y > this.pageHeight - 30) {
        this.doc.addPage();
        y = this.margins.top;
      }
      this.doc.text(line, this.margins.left, y);
      y += 5;
    });
  }
}