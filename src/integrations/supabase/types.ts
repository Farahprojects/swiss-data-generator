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
      api_keys: {
        Row: {
          api_key: string
          balance_usd: number
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key: string
          balance_usd?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string
          balance_usd?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          created_at: string | null
          endpoint: string
          geo_price_usd: number | null
          id: string
          report_price_usd: number | null
          report_tier: string | null
          total_cost_usd: number
          translator_log_id: string
          unit_price_usd: number
          used_geo_lookup: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          geo_price_usd?: number | null
          id?: string
          report_price_usd?: number | null
          report_tier?: string | null
          total_cost_usd: number
          translator_log_id: string
          unit_price_usd: number
          used_geo_lookup?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          geo_price_usd?: number | null
          id?: string
          report_price_usd?: number | null
          report_tier?: string | null
          total_cost_usd?: number
          translator_log_id?: string
          unit_price_usd?: number
          used_geo_lookup?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_translator_log_id_fkey"
            columns: ["translator_log_id"]
            isOneToOne: false
            referencedRelation: "translator_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount_usd: number | null
          api_call_type: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          card_brand: string | null
          card_last4: string | null
          city: string | null
          country: string | null
          description: string | null
          email: string | null
          full_name: string | null
          id: number
          payment_method_type: string | null
          payment_status: string | null
          postal_code: string | null
          reference_id: string | null
          state: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_pid: string | null
          ts: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd?: number | null
          api_call_type?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          card_brand?: string | null
          card_last4?: string | null
          city?: string | null
          country?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          id?: number
          payment_method_type?: string | null
          payment_status?: string | null
          postal_code?: string | null
          reference_id?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_pid?: string | null
          ts?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number | null
          api_call_type?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          card_brand?: string | null
          card_last4?: string | null
          city?: string | null
          country?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          id?: number
          payment_method_type?: string | null
          payment_status?: string | null
          postal_code?: string | null
          reference_id?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_pid?: string | null
          ts?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          log_level: string | null
          message: string | null
          sequence_number: number | null
          session_id: string | null
          source: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          log_level?: string | null
          message?: string | null
          sequence_number?: number | null
          session_id?: string | null
          source: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          log_level?: string | null
          message?: string | null
          sequence_number?: number | null
          session_id?: string | null
          source?: string
        }
        Relationships: []
      }
      geo_cache: {
        Row: {
          lat: number
          lon: number
          place: string
          updated_at: string | null
        }
        Insert: {
          lat: number
          lon: number
          place: string
          updated_at?: string | null
        }
        Update: {
          lat?: number
          lon?: number
          place?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          document_type: string
          id: string
          is_current: boolean
          published_date: string
          title: string
          version: string
        }
        Insert: {
          content: string
          document_type: string
          id?: string
          is_current?: boolean
          published_date?: string
          title: string
          version: string
        }
        Update: {
          content?: string
          document_type?: string
          id?: string
          is_current?: boolean
          published_date?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      price_list: {
        Row: {
          description: string | null
          endpoint: string | null
          id: string
          name: string
          report_tier: string | null
          unit_price_usd: number
        }
        Insert: {
          description?: string | null
          endpoint?: string | null
          id: string
          name: string
          report_tier?: string | null
          unit_price_usd: number
        }
        Update: {
          description?: string | null
          endpoint?: string | null
          id?: string
          name?: string
          report_tier?: string | null
          unit_price_usd?: number
        }
        Relationships: []
      }
      report_prompts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          system_prompt: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          system_prompt: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          system_prompt?: string
        }
        Relationships: []
      }
      stripe_links: {
        Row: {
          created_at: string | null
          description: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      stripe_products: {
        Row: {
          active: boolean | null
          amount_usd: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          name: string
          price_id: string
          product_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amount_usd: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          name: string
          price_id: string
          product_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amount_usd?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          name?: string
          price_id?: string
          product_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_users: {
        Row: {
          addon_relationship_compatibility: boolean | null
          addon_transit_12_months: boolean | null
          addon_yearly_cycle: boolean | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          card_brand: string | null
          card_last4: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          payment_method_type: string | null
          payment_status: string | null
          phone: string | null
          plan_name: string | null
          postal_code: string | null
          state: string | null
          stripe_customer_id: string
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          updated_at: string | null
        }
        Insert: {
          addon_relationship_compatibility?: boolean | null
          addon_transit_12_months?: boolean | null
          addon_yearly_cycle?: boolean | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          card_brand?: string | null
          card_last4?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          payment_method_type?: string | null
          payment_status?: string | null
          phone?: string | null
          plan_name?: string | null
          postal_code?: string | null
          state?: string | null
          stripe_customer_id: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          updated_at?: string | null
        }
        Update: {
          addon_relationship_compatibility?: boolean | null
          addon_transit_12_months?: boolean | null
          addon_yearly_cycle?: boolean | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          card_brand?: string | null
          card_last4?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          payment_method_type?: string | null
          payment_status?: string | null
          phone?: string | null
          plan_name?: string | null
          postal_code?: string | null
          state?: string | null
          stripe_customer_id?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_event_type: string
          stripe_kind: Database["public"]["Enums"]["stripe_event_kind"]
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_event_type: string
          stripe_kind?: Database["public"]["Enums"]["stripe_event_kind"]
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_event_type?: string
          stripe_kind?: Database["public"]["Enums"]["stripe_event_kind"]
        }
        Relationships: []
      }
      swissdebuglogs: {
        Row: {
          api_key: string | null
          balance_usd: number | null
          id: number
          request_payload: Json | null
          request_type: string | null
          response_status: number | null
          response_text: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          balance_usd?: number | null
          id?: number
          request_payload?: Json | null
          request_type?: string | null
          response_status?: number | null
          response_text?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          balance_usd?: number | null
          id?: number
          request_payload?: Json | null
          request_type?: string | null
          response_status?: number | null
          response_text?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      topup_queue: {
        Row: {
          amount_usd: number
          error_message: string | null
          id: string
          processed_at: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          error_message?: string | null
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          error_message?: string | null
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      translator_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          google_geo: boolean | null
          id: string
          processing_time_ms: number | null
          report_tier: string | null
          request_payload: Json | null
          request_type: string | null
          response_payload: Json | null
          response_status: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          google_geo?: boolean | null
          id?: string
          processing_time_ms?: number | null
          report_tier?: string | null
          request_payload?: Json | null
          request_type?: string | null
          response_payload?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          google_geo?: boolean | null
          id?: string
          processing_time_ms?: number | null
          report_tier?: string | null
          request_payload?: Json | null
          request_type?: string | null
          response_payload?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance_usd: number
          last_updated: string | null
          user_id: string
        }
        Insert: {
          balance_usd?: number
          last_updated?: string | null
          user_id: string
        }
        Update: {
          balance_usd?: number
          last_updated?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      stripe_webhook_logs: {
        Row: {
          created_at: string | null
          id: string | null
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_event_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_event_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_event_type?: string | null
        }
        Relationships: []
      }
      v_api_key_balance: {
        Row: {
          api_key: string | null
          balance_usd: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_user_credits: {
        Args: {
          _user_id: string
          _amount_usd: number
          _type?: string
          _description?: string
          _stripe_pid?: string
        }
        Returns: undefined
      }
      create_user_after_payment: {
        Args: { user_id: string; plan_type?: string }
        Returns: undefined
      }
      gen_random_bytes: {
        Args: { "": number }
        Returns: string
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_session_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      record_api_usage: {
        Args: {
          _user_id: string
          _endpoint: string
          _cost_usd: number
          _request_params?: Json
          _response_status?: number
          _processing_time_ms?: number
        }
        Returns: string
      }
      regenerate_api_key: {
        Args: { _user_id: string }
        Returns: string
      }
      toggle_addon: {
        Args: { user_id_param: string; addon_name: string; enabled: boolean }
        Returns: undefined
      }
      upgrade_plan: {
        Args: { user_id_param: string; new_plan: string }
        Returns: undefined
      }
      validate_api_key: {
        Args: { _api_key: string }
        Returns: string
      }
    }
    Enums: {
      stripe_event_kind:
        | "payment_intent"
        | "charge"
        | "customer"
        | "invoice"
        | "checkout"
        | "subscription"
        | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      stripe_event_kind: [
        "payment_intent",
        "charge",
        "customer",
        "invoice",
        "checkout",
        "subscription",
        "unknown",
      ],
    },
  },
} as const
