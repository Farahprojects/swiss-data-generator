
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

    // Logo as text using serif font to match GT Sectra
    const logoY = 20;
    this.doc.setFontSize(26);
    this.doc.setFont('times', 'bold'); // Using Times as it's closer to GT Sectra serif style
    this.doc.setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(40, 40, 60);
    this.doc.text(' Intelligence Report ', this.pageWidth / 2, logoY + 28, { align: 'center' });

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

    // Enhanced Content Processing
    const cleanedContent = this.cleanContent(data.content);
    const processedContent = this.processSpecialSections(cleanedContent);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(33);

    let lineY = y + 12;
    const lineHeight = 6;
    const bottomPadding = 20;

    for (let i = 0; i < processedContent.length; i++) {
      const item = processedContent[i];

      if (lineY + lineHeight > this.pageHeight - bottomPadding) {
        this.doc.addPage();
        lineY = this.margins.top;
      }

      if (item.type === 'heading') {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(40, 40, 60);
        this.doc.text(item.text, this.margins.left, lineY);
        lineY += lineHeight + 3; // Extra space after headings
      } else if (item.type === 'action-item') {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(33);
        this.doc.text(item.text, this.margins.left, lineY);
        lineY += lineHeight + 2; // Extra space between action items
      } else if (item.type === 'tag-category') {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(40, 40, 60);
        this.doc.text(item.text, this.margins.left, lineY);
        lineY += lineHeight + 1; // Moderate space for tag categories
      } else {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(33);
        this.doc.text(item.text, this.margins.left, lineY);
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

  private cleanContent(content: string): string {
    // Remove HTML tags (e.g., <tag>, </tag>)
    let cleaned = content.replace(/<[^>]*>/g, '');
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold markdown
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic markdown
    cleaned = cleaned.replace(/[_`]/g, ''); // Underscores and backticks
    
    // Remove other common formatting artifacts
    cleaned = cleaned.replace(/#{1,6}\s*/g, ''); // Markdown headers
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Markdown links
    
    return cleaned.trim();
  }

  private processSpecialSections(content: string): Array<{ type: string; text: string }> {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const processed: Array<{ type: string; text: string }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Check for main headings (Summary, Insights, Actions, Tags, etc.)
      if (this.isMainHeading(line)) {
        processed.push({ type: 'heading', text: line });
        continue;
      }
      
      // Check for tag categories (Positive:, Negative:, etc.)
      if (this.isTagCategory(line)) {
        processed.push({ type: 'tag-category', text: line });
        continue;
      }
      
      // Check for action items (numbered items under Actions section)
      if (this.isActionItem(line)) {
        processed.push({ type: 'action-item', text: line });
        continue;
      }
      
      // Split long lines to fit page width
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
    
    // Check if line is a heading (short line that matches common headings and ends with : or is standalone)
    if (line.length < 60) {
      return headings.some(heading => 
        lowerLine === heading || 
        lowerLine === heading + ':' ||
        lowerLine.includes(heading + ':')
      );
    }
    
    return false;
  }

  private isTagCategory(line: string): boolean {
    const lowerLine = line.toLowerCase().trim();
    const categories = ['positive:', 'negative:', 'neutral:', 'strengths:', 'challenges:'];
    
    return categories.some(category => lowerLine === category || lowerLine.startsWith(category));
  }

  private isActionItem(line: string): boolean {
    // Check if line starts with a number followed by a period (1., 2., 3., etc.)
    return /^\d+\.\s/.test(line.trim());
  }
}
