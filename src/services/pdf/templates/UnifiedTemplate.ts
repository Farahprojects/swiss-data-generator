import jsPDF from 'jspdf';
import { PdfTemplate, PdfGenerationOptions } from '../types';

export interface UnifiedPdfData {
  reportContent?: string;
  swissData?: any;
  customerName: string;
  reportPdfData?: string;
}

export class UnifiedTemplate implements PdfTemplate {
  private options: PdfGenerationOptions;

  constructor(options?: PdfGenerationOptions) {
    this.options = {
      format: 'a4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      includeHeader: true,
      includeFooter: true,
      ...options
    };
  }

  async generate(data: UnifiedPdfData, options?: PdfGenerationOptions): Promise<void> {
    const doc = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.format
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = this.options.margins!;
    
    let currentY = margins.top;

    // Header
    if (this.options.includeHeader) {
      currentY = this.addHeader(doc, data.customerName, currentY, pageWidth, margins);
    }

    // AI Report Section (Priority - Front and Center)
    if (data.reportContent) {
      currentY = this.addAIReportSection(doc, data.reportContent, currentY, pageWidth, pageHeight, margins);
    }

    // Astro Data Section
    if (data.swissData) {
      currentY = this.addAstroSection(doc, data.swissData, currentY, pageWidth, pageHeight, margins);
    }

    // Footer
    if (this.options.includeFooter) {
      this.addFooter(doc, pageWidth, pageHeight);
    }

    // Download the PDF
    const filename = `${data.customerName.replace(/\s+/g, '_')}_Complete_Report.pdf`;
    doc.save(filename);
  }

  private addHeader(doc: jsPDF, customerName: string, startY: number, pageWidth: number, margins: any): number {
    doc.setFontSize(26).setFont("times", "bold").text("Therai.", pageWidth/2, startY + 12, { align: "center" });
    doc.setFontSize(20).setFont("helvetica", "bold").text("Complete Intelligence Report", pageWidth/2, startY + 28, { align: "center" });
    
    doc.setFontSize(12).setFont("helvetica", "normal").setTextColor(100);
    doc.text(`Generated for: ${customerName}`, margins.left, startY + 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margins.left, startY + 55);
    
    return startY + 70;
  }

  private addAIReportSection(doc: jsPDF, reportContent: string, startY: number, pageWidth: number, pageHeight: number, margins: any): number {
    // Check if we need a new page
    if (startY > pageHeight - 100) {
      doc.addPage();
      startY = margins.top;
    }

    // Section Header
    doc.setFontSize(18).setFont("helvetica", "bold").setTextColor(75, 63, 114);
    doc.text("AI Intelligence Report", margins.left, startY);
    startY += 15;

    // Clean HTML content to get plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportContent;
    const cleanText = tempDiv.textContent || tempDiv.innerText || '';

    // Split content into paragraphs and process
    const paragraphs = cleanText.split('\n').filter(p => p.trim());
    
    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(33);
    const lineHeight = 7;
    const maxWidth = pageWidth - margins.left - margins.right;

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      // Check for headings (lines that are short and appear to be titles)
      if (paragraph.length < 100 && paragraph.includes(':')) {
        doc.setFont("helvetica", "bold").setTextColor(40, 40, 60);
        const lines = doc.splitTextToSize(paragraph, maxWidth);
        for (const line of lines) {
          if (startY > pageHeight - 30) {
            doc.addPage();
            startY = margins.top;
          }
          doc.text(line, margins.left, startY);
          startY += lineHeight;
        }
        doc.setFont("helvetica", "normal").setTextColor(33);
        startY += 5;
      } else {
        const lines = doc.splitTextToSize(paragraph, maxWidth);
        for (const line of lines) {
          if (startY > pageHeight - 30) {
            doc.addPage();
            startY = margins.top;
          }
          doc.text(line, margins.left, startY);
          startY += lineHeight;
        }
        startY += 10;
      }
    }

    return startY + 20;
  }

  private addAstroSection(doc: jsPDF, swissData: any, startY: number, pageWidth: number, pageHeight: number, margins: any): number {
    // Check if we need a new page
    if (startY > pageHeight - 100) {
      doc.addPage();
      startY = margins.top;
    }

    // Section Header
    doc.setFontSize(18).setFont("helvetica", "bold").setTextColor(75, 63, 114);
    doc.text("Astrological Data", margins.left, startY);
    startY += 15;

    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(33);
    
    // Extract and format astro data
    if (swissData.chart_data) {
      const chartData = swissData.chart_data;
      
      // Birth details
      if (chartData.birth_details) {
        doc.setFont("helvetica", "bold");
        doc.text("Birth Details:", margins.left, startY);
        startY += 10;
        
        doc.setFont("helvetica", "normal");
        if (chartData.birth_details.date) {
          doc.text(`Date: ${chartData.birth_details.date}`, margins.left + 5, startY);
          startY += 7;
        }
        if (chartData.birth_details.time) {
          doc.text(`Time: ${chartData.birth_details.time}`, margins.left + 5, startY);
          startY += 7;
        }
        if (chartData.birth_details.location) {
          doc.text(`Location: ${chartData.birth_details.location}`, margins.left + 5, startY);
          startY += 7;
        }
        startY += 10;
      }

      // Planetary positions
      if (chartData.planets) {
        doc.setFont("helvetica", "bold");
        doc.text("Planetary Positions:", margins.left, startY);
        startY += 10;
        
        doc.setFont("helvetica", "normal");
        Object.entries(chartData.planets).forEach(([planet, data]: [string, any]) => {
          if (startY > pageHeight - 30) {
            doc.addPage();
            startY = margins.top;
          }
          doc.text(`${planet}: ${data.sign || 'N/A'} ${data.degree || ''}°`, margins.left + 5, startY);
          startY += 7;
        });
      }
    }

    return startY + 20;
  }

  private addFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
    doc.setFontSize(9).setFont("helvetica", "italic").setTextColor(120);
    doc.text("Generated by TheraI - www.theraiastro.com", pageWidth/2, pageHeight - 15, { align: "center" });
  }
}