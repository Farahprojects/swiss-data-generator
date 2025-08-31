
import { BaseTemplate } from './BaseTemplate';
import { ReportPdfData, PdfGenerationOptions, PdfMetadata } from '../types';
import { ReportParser } from '@/utils/reportParser';

export class ReportTemplate extends BaseTemplate {
  async generate(data: ReportPdfData, options: PdfGenerationOptions = {}): Promise<void> {
    const metadata: PdfMetadata = {
      title: 'Essence Professional',
      subject: 'Client Energetic Insight',
      author: 'Theria Astro',
      keywords: ['astrology', 'psychology', 'client profile']
    };
    this.setMetadata(metadata);

    // ═════════════ HEADER ═════════════
    const logoY = 20;
    this.doc.setFontSize(26).setFont('times', 'normal').setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    this.doc.setFontSize(20).setFont('helvetica', 'bold');
    this.doc.text('Intelligence Report', this.pageWidth / 2, logoY + 28, { align: 'center' });

    // ═════════════ META ═════════════
    let y = logoY + 40;
    this.doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100);
    this.doc.text('Report ID:', this.margins.left, y);
    this.doc.setFont('helvetica', 'bold').text(data.id.substring(0, 8), this.margins.left + 40, y);

    this.doc.setFont('helvetica', 'normal');
    y += 6;
    this.doc.text('Generated At:', this.margins.left, y);
    this.doc.setFont('helvetica', 'bold').text(data.metadata.generatedAt, this.margins.left + 40, y);

    // ═════════════ ERROR (early‑exit) ═════════════
    if (data.error) {
      this.doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(200, 0, 0);
      this.doc.text('Error:', this.margins.left, y + 10);
      this.doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(0, 0, 0);
      const lines = this.doc.splitTextToSize(data.error, this.pageWidth - this.margins.left - this.margins.right);
      this.doc.text(lines, this.margins.left, y + 17);
      return;
    }

    // ═════════════ SECTION TITLE ═════════════
    y += 18;
    this.doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(75, 63, 114);
    this.doc.text('Client Energetic Insight', this.margins.left, y);

    // ═════════════ PRE‑PROCESS CONTENT ═════════════
    const blocks = ReportParser.parseReport(data.content);

    // ═════════════ RENDER LOOP ═════════════
    this.doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(33);
    let lineY = y + 12;
    const lineH = 7.2;
    const headingGap = 10;
    const footerPad = 20;

    const newPage = () => {
      this.doc.addPage();
      lineY = this.margins.top;
    };

    const ensure = (extra = 0) => {
      if (lineY + extra > this.pageHeight - footerPad) newPage();
    };

    blocks.forEach(b => {
      switch (b.type) {
        case 'heading':
          lineY += headingGap;
          ensure(lineH);
          this.doc.setFont('helvetica', 'bold').setTextColor(40, 40, 60);
          this.doc.text(b.text, this.margins.left, lineY);
          this.doc.setFont('helvetica', 'normal').setTextColor(33);
          lineY += lineH;
          break;

        case 'action':
          const aWrap = this.doc.splitTextToSize(b.text, this.pageWidth - this.margins.left - this.margins.right - 5);
          aWrap.forEach(l => {
            ensure(lineH);
            this.doc.text(l, this.margins.left + 5, lineY);
            lineY += lineH;
          });
          lineY += 2; // small gap after each action
          break;

        case 'tag':
          ensure(lineH);
          this.doc.setTextColor(60).text(b.text, this.margins.left + 5, lineY);
          this.doc.setTextColor(33);
          lineY += lineH;
          break;

        case 'spacer':
          lineY += lineH; // blank line
          break;

        default: // normal paragraph
          const pWrap = this.doc.splitTextToSize(b.text, this.pageWidth - this.margins.left - this.margins.right);
          pWrap.forEach(l => {
            ensure(lineH);
            this.doc.text(l, this.margins.left, lineY);
            lineY += lineH;
          });
          lineY += 2; // gap between paragraphs
      }
    });

    // ═════════════ FOOTER ═════════════
    if (options.includeFooter !== false && lineY + 15 < this.pageHeight) {
      // Footer placeholder - no content by default
    }

    // ═════════════ SAVE ═════════════
    const fname = `report-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(fname);
  }
}
