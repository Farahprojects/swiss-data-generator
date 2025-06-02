
export interface PdfMetadata {
  title: string;
  subject?: string;
  author?: string;
  creator?: string;
  keywords?: string[];
}

export interface ReportPdfData {
  id: string;
  title: string;
  content: string;
  metadata: {
    generatedAt: string;
    reportType?: string;
    processingTime?: string;
    cost?: string;
    status?: number;
  };
  error?: string;
}

export interface PdfGenerationOptions {
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export interface PdfTemplate {
  generate(data: any, options?: PdfGenerationOptions): Promise<void>;
}
