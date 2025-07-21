
// Shared API response contracts
export interface BaseApiResponse {
  success: boolean;
}

export interface SuccessResponse<TData = any> extends BaseApiResponse {
  success: true;
  data: TData;
}

export interface ErrorResponse extends BaseApiResponse {
  success: false;
  code: string;
  message: string;
  suggestions?: string[];
  context?: string;
}

export type ApiResponse<TData = any> = SuccessResponse<TData> | ErrorResponse;

// Guest Report specific types
export interface GuestReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    swiss_boolean: boolean | null;
    is_ai_report: boolean;
    payment_status: string;
    created_at: string;
    promo_code_used: string | null;
    report_data: any;
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    is_astro_report: boolean;
    is_ai_report: boolean;
    content_type: 'astro' | 'ai' | 'both' | 'none';
    status: 'ready' | 'processing' | 'pending_payment' | 'error';
  };
}

export type GuestReportResponse = ApiResponse<GuestReportData>;
