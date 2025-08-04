export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      guest_reports: {
        Row: {
          id: string
          user_id: string | null
          stripe_session_id: string
          email: string
          report_type: string | null
          amount_paid: number
          report_data: Json
          payment_status: string
          purchase_type: string | null
          promo_code_used: string | null
          email_sent: boolean
          modal_ready: boolean | null
          translator_log_id: string | null
          is_ai_report: boolean | null
          created_at: string
          coach_id: string | null
          coach_name: string | null
          coach_slug: string | null
          edge_function_confirmed: boolean | null
          has_report_log: boolean | null
          has_swiss_error: boolean | null
          report_pdf_data: string | null
          swiss_boolean: boolean | null
          user_error_id: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          stripe_session_id: string
          email: string
          report_type?: string | null
          amount_paid: number
          report_data?: Json
          payment_status?: string
          purchase_type?: string | null
          promo_code_used?: string | null
          email_sent?: boolean
          modal_ready?: boolean | null
          translator_log_id?: string | null
          is_ai_report?: boolean | null
          created_at?: string
          coach_id?: string | null
          coach_name?: string | null
          coach_slug?: string | null
          edge_function_confirmed?: boolean | null
          has_report_log?: boolean | null
          has_swiss_error?: boolean | null
          report_pdf_data?: string | null
          swiss_boolean?: boolean | null
          user_error_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          stripe_session_id?: string
          email?: string
          report_type?: string | null
          amount_paid?: number
          report_data?: Json
          payment_status?: string
          purchase_type?: string | null
          promo_code_used?: string | null
          email_sent?: boolean
          modal_ready?: boolean | null
          translator_log_id?: string | null
          is_ai_report?: boolean | null
          created_at?: string
          coach_id?: string | null
          coach_name?: string | null
          coach_slug?: string | null
          edge_function_confirmed?: boolean | null
          has_report_log?: boolean | null
          has_swiss_error?: boolean | null
          report_pdf_data?: string | null
          swiss_boolean?: boolean | null
          user_error_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_reports_user_error_id_fkey"
            columns: ["user_error_id"]
            isOneToOne: false
            referencedRelation: "user_errors"
            referencedColumns: ["id"]
          }
        ]
      }
      // Add other tables as needed...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
