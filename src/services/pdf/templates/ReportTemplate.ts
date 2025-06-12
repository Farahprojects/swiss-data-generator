
import { BaseTemplate } from './BaseTemplate';
import { ReportPdfData, PdfGenerationOptions, PdfMetadata } from '../types';

export class ReportTemplate extends BaseTemplate {
  async generate(data: ReportPdfData, options: PdfGenerationOptions = {}): Promise<void> {
    const metadata: PdfMetadata = {
      title: 'Essence Professional',
      subject: 'Client Energetic Insight',
      author: 'Theria Astro',
      keywords: ['astrology', 'psychology', 'client profile']
    };
    this.setMetadata(metadata);

    // Logo as text instead of image
    const logoY = 20;
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 10, { align: 'center' });

    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text(' Intelligence Report ', this.pageWidth / 2, logoY + 25, { align: 'center' });

    // Metadata section
    let y = logoY + 40;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100);

    this.doc.text('Report ID:', this.margins.left, y);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.id.substring(0, 8), this.margins.left + 40, y);

    this.doc.setFont('helvetica', 'normal');
    y += 6;
    this.doc.text('Generated At:', this.margins.left, y);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.metadata.generatedAt, this.margins.left + 40, y);

    // Error Handling
    if (data.error) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(200, 0, 0);
      this.doc.text('Error:', this.margins.left, y + 10);

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      const errorLines = this.doc.splitTextToSize(data.error, this.pageWidth - this.margins.left - this.margins.right);
      this.doc.text(errorLines, this.margins.left, y + 17);
      return;
    }

    // Section Header
    y += 18;
    this.doc.setFontSize(13);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(75, 63, 114);
    this.doc.text('Client Energetic Insight', this.margins.left, y);

    // Body Content
    const contentText = data.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[_`]/g, '');
    const contentLines = this.doc.splitTextToSize(
      contentText,
      this.pageWidth - this.margins.left - this.margins.right
    );

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(33);

    let lineY = y + 12;
    const lineHeight = 6;
    const bottomPadding = 20;

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].trim();

      if (lineY + lineHeight > this.pageHeight - bottomPadding) {
        this.doc.addPage();
        lineY = this.margins.top;
      }

      const isLikelyHeading = 
        line.length < 60 &&
        line.endsWith(':') &&
        (i + 1 < contentLines.length && contentLines[i + 1].trim().length > 60);

      if (isLikelyHeading) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(40, 40, 60);
        this.doc.text(line, this.margins.left, lineY);
        lineY += lineHeight;
        // Add extra space after heading
        lineY += lineHeight;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(33);
      } else {
        this.doc.text(line, this.margins.left, lineY);
        lineY += lineHeight;
      }
    }

    // Footer
    if (options.includeFooter !== false && lineY + 15 < this.pageHeight) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(120);
      this.doc.text(
        `www.theraiastro.com`,
        this.pageWidth / 2,
        this.pageHeight - 15,
        { align: 'center' }
      );
    }

    const filename = `report-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(filename);
  }
}
