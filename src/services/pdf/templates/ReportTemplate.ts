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

    const logoY = 20;
    this.doc.setFontSize(26);
    this.doc.setFont('times', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text(' Intelligence Report ', this.pageWidth / 2, logoY + 28, { align: 'center' });

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

    y += 18;
    this.doc.setFontSize(13);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(75, 63, 114);
    this.doc.text('Client Energetic Insight', this.margins.left, y);

    const cleanedContent = this.cleanContent(data.content);
    const processedContent = this.processSpecialSections(cleanedContent);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(33);

    let lineY = y + 12;
    const lineHeight = 7.5;
    const paragraphSpacing = 4;
    const headingSpacing = 10;
    const bottomPadding = 20;

    for (let i = 0; i < processedContent.length; i++) {
      const item = processedContent[i];

      if (lineY + lineHeight > this.pageHeight - bottomPadding) {
        this.doc.addPage();
        lineY = this.margins.top;
      }

      if (item.type === 'heading') {
        lineY += headingSpacing;
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(40, 40, 60);
        this.doc.text(item.text, this.margins.left, lineY);
        lineY += lineHeight;
      } else if (item.type === 'action-item') {
        const actionLines = this.doc.splitTextToSize(item.text, this.pageWidth - this.margins.left - this.margins.right - 5);
        actionLines.forEach(line => {
          if (lineY + lineHeight > this.pageHeight - bottomPadding) {
            this.doc.addPage();
            lineY = this.margins.top;
          }
          this.doc.text(line, this.margins.left + 5, lineY);
          lineY += lineHeight;
        });
        lineY += paragraphSpacing;
      } else if (item.type === 'tag') {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(60);
        this.doc.text(item.text, this.margins.left + 5, lineY);
        lineY += lineHeight;
      } else {
        const paragraphLines = this.doc.splitTextToSize(item.text, this.pageWidth - this.margins.left - this.margins.right);
        paragraphLines.forEach(line => {
          if (lineY + lineHeight > this.pageHeight - bottomPadding) {
            this.doc.addPage();
            lineY = this.margins.top;
          }
          this.doc.text(line, this.margins.left, lineY);
          lineY += lineHeight;
        });
        lineY += paragraphSpacing;
      }
    }

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

  private cleanContent(content: string): string {
    let cleaned = content.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    cleaned = cleaned.replace(/[_`]/g, '');
    cleaned = cleaned.replace(/#{1,6}\s*/g, '');
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return cleaned.trim();
  }

  private processSpecialSections(content: string): Array<{ type: string; text: string }> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const processed: Array<{ type: string; text: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      if (this.isMainHeading(line)) {
        processed.push({ type: 'heading', text: line });
        continue;
      }

      if (lowerLine.startsWith('positivetags:') || lowerLine.startsWith('negativetags:')) {
        const category = lowerLine.startsWith('positivetags:') ? 'Positive Traits' : 'Negative Traits';
        processed.push({ type: 'heading', text: category });

        const tagList = line.split(':')[1].split(',').map(tag => tag.trim());
        tagList.forEach(tag => {
          processed.push({ type: 'tag', text: `• ${tag}` });
        });
        continue;
      }

      if (this.isActionItem(line)) {
        processed.push({ type: 'action-item', text: line });
        continue;
      }

      const splitLines = this.doc.splitTextToSize(
        line,
        this.pageWidth - this.margins.left - this.margins.right
      );

      for (const splitLine of splitLines) {
        if (splitLine.trim()) {
          processed.push({ type: 'normal', text: splitLine.trim() });
        }
      }
    }

    return processed;
  }

  private isMainHeading(line: string): boolean {
    const lowerLine = line.toLowerCase().trim();
    const headings = [
      'summary', 'insights', 'actions', 'tags', 'conclusion', 
      'recommendations', 'overview', 'analysis', 'findings',
      'key points', 'next steps', 'takeaways'
    ];

    if (line.length < 60) {
      return headings.some(heading => 
        lowerLine === heading || 
        lowerLine === heading + ':' ||
        lowerLine.includes(heading + ':')
      );
    }

    return false;
  }

  private isActionItem(line: string): boolean {
    return /^\d+\.\s/.test(line.trim());
  }
}
