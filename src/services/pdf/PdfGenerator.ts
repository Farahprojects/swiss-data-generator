
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

  // Future template methods can be added here
  // static async generateAdminReport(data: AdminReportData, options?: PdfGenerationOptions): Promise<void>
  // static async generateBillingStatement(data: BillingData, options?: PdfGenerationOptions): Promise<void>
}
