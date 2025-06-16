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

    // ────────────────────────────────────────────────────
    // HEADER
    // ────────────────────────────────────────────────────
    const logoY = 20;
    this.doc.setFontSize(26);
    this.doc.setFont('times', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text('Intelligence Report', this.pageWidth / 2, logoY + 28, { align: 'center' });

    // ────────────────────────────────────────────────────
    // META INFO
    // ────────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────────
    // ERROR BLOCK (early‑exit)
    // ────────────────────────────────────────────────────
    if (data.error) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(200, 0, 0);
      this.doc.text('Error:', this.margins.left, y + 10);

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      const errorLines = this.doc.splitTextToSize(
        data.error,
        this.pageWidth - this.margins.left - this.margins.right
      );
      this.doc.text(errorLines, this.margins.left, y + 17);
      return;
    }

    // ────────────────────────────────────────────────────
    // MAIN TITLE
    // ────────────────────────────────────────────────────
    y += 18;
    this.doc.setFontSize(13);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(75, 63, 114);
    this.doc.text('Client Energetic Insight', this.margins.left, y);

    // ────────────────────────────────────────────────────
    // PRE‑PROCESS CONTENT
    // ────────────────────────────────────────────────────
    const cleanedContent = this.cleanContent(data.content);
    const processedContent = this.processSpecialSections(cleanedContent);

    // ────────────────────────────────────────────────────
    // CONTENT LOOP
    // ────────────────────────────────────────────────────
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(33);

    let lineY = y + 12;
    const lineHeight = 7.5;          // single‑line height
    const headingSpacing = 10;       // gap before headings
    const bottomPadding = 20;        // footer safety‑zone

    const addPageIfNeeded = (additional = 0) => {
      if (lineY + additional > this.pageHeight - bottomPadding) {
        this.doc.addPage();
        lineY = this.margins.top;
      }
    };

    processedContent.forEach(item => {
      switch (item.type) {
        case 'heading': {
          lineY += headingSpacing;
          addPageIfNeeded(lineHeight);
          this.doc.setFont('helvetica', 'bold');
          this.doc.setTextColor(40, 40, 60);
          this.doc.text(item.text, this.margins.left, lineY);
          this.doc.setFont('helvetica', 'normal'); // reset
          this.doc.setTextColor(33);
          lineY += lineHeight;
          break;
        }

        case 'action-item': {
          const wrapped = this.doc.splitTextToSize(
            item.text,
            this.pageWidth - this.margins.left - this.margins.right - 5
          );
          wrapped.forEach(wLine => {
            addPageIfNeeded(lineHeight);
            this.doc.text(wLine, this.margins.left + 5, lineY);
            lineY += lineHeight;
          });
          break;
        }

        case 'tag': {
          addPageIfNeeded(lineHeight);
          this.doc.setFont('helvetica', 'normal');
          this.doc.setTextColor(60);
          this.doc.text(item.text, this.margins.left + 5, lineY);
          this.doc.setTextColor(33);
          lineY += lineHeight;
          break;
        }

        default: { // normal paragraph text
          const wrapped = this.doc.splitTextToSize(
            item.text,
            this.pageWidth - this.margins.left - this.margins.right
          );
          wrapped.forEach(wLine => {
            addPageIfNeeded(lineHeight);
            this.doc.text(wLine, this.margins.left, lineY);
            lineY += lineHeight;
          });
          break;
        }
      }
    });

    // ────────────────────────────────────────────────────
    // FOOTER
    // ────────────────────────────────────────────────────
    if (options.includeFooter !== false && lineY + 15 < this.pageHeight) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(120);
      this.doc.text('www.theraiastro.com', this.pageWidth / 2, this.pageHeight - 15, { align: 'center' });
    }

    // ────────────────────────────────────────────────────
    // SAVE / DOWNLOAD
    // ────────────────────────────────────────────────────
    const filename = `report-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(filename);
  }

  // ────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────
  private cleanContent(content: string): string {
    return content
      .replace(/<[^>]*>/g, '')            // HTML tags
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold markdown
      .replace(/\*(.*?)\*/g, '$1')       // italics markdown
      .replace(/[_`]/g, '')               // underscores / backticks
      .replace(/#{1,6}\s*/g, '')         // markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links
      .trim();
  }

  private processSpecialSections(content: string) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const processed: { type: string; text: string }[] = [];

    lines.forEach(line => {
      const lower = line.toLowerCase();

      if (this.isMainHeading(line)) {
        processed.push({ type: 'heading', text: line });
        return;
      }

      if (lower.startsWith('positivetags:') || lower.startsWith('negativetags:')) {
        const label = lower.startsWith('positivetags:') ? 'Positive Traits' : 'Negative Traits';
        processed.push({ type: 'heading', text: label });
        line.split(':')[1].split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
          processed.push({ type: 'tag', text: `• ${tag}` });
        });
        return;
      }

      if (this.isActionItem(line)) {
        processed.push({ type: 'action-item', text: line });
        return;
      }

      processed.push({ type: 'normal', text: line });
    });

    return processed;
  }

  private isMainHeading(line: string): boolean {
    const lower = line.toLowerCase().trim();
    const heads = [
      'summary','insights','actions','tags','conclusion','recommendations',
      'overview','analysis','findings','key points','next steps','takeaways'
    ];
    return line.length < 60 && heads.some(h => lower === h || lower === `${h}:` || lower.startsWith(`${h}:`));
  }

  private isActionItem(line: string): boolean {
    return /^\d+\.\s/.test(line.trim());
  }
}
