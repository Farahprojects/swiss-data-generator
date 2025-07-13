
import { ReportTemplate } from './templates/ReportTemplate';
import { AstroTemplate, AstroPdfData } from './templates/AstroTemplate';
import { UnifiedTemplate, UnifiedPdfData } from './templates/UnifiedTemplate';
import { ReportPdfData, PdfGenerationOptions } from './types';

export class PdfGenerator {
  static async generateReportPdf(data: ReportPdfData, options?: PdfGenerationOptions): Promise<void> {
    const template = new ReportTemplate(options);
    await template.generate(data, options);
  }

  static async generateAstroPdf(data: AstroPdfData, options?: PdfGenerationOptions): Promise<void> {
    const template = new AstroTemplate(options);
    await template.generate(data, options);
  }

  static async generateUnifiedPdf(data: UnifiedPdfData, options?: PdfGenerationOptions): Promise<void> {
    const template = new UnifiedTemplate(options);
    await template.generate(data, options);
  }

  static async generateFromDom(element: HTMLElement, filename: string = 'report.pdf'): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF from DOM:', error);
      throw error;
    }
  }

  // Future template methods can be added here
  // static async generateAdminReport(data: AdminReportData, options?: PdfGenerationOptions): Promise<void>
  // static async generateBillingStatement(data: BillingData, options?: PdfGenerationOptions): Promise<void>
}
