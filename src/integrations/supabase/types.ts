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
          created_at: string
          expires_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          expires_at?: string | null
          id?: string
          status: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_products: {
        Row: {
          active: boolean
          description: string
          endpoint_url: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          description: string
          endpoint_url: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          description?: string
          endpoint_url?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key: string
          birth_date: string
          birth_time: string
          city: string
          country: string
          created_at: string | null
          endpoint_called: string
          error_message: string | null
          log_id: string
          second_birth_date: string | null
          second_birth_time: string | null
          second_city: string | null
          second_country: string | null
          status: string
          system: string
          user_id: string | null
        }
        Insert: {
          api_key: string
          birth_date: string
          birth_time: string
          city: string
          country: string
          created_at?: string | null
          endpoint_called: string
          error_message?: string | null
          log_id?: string
          second_birth_date?: string | null
          second_birth_time?: string | null
          second_city?: string | null
          second_country?: string | null
          status?: string
          system: string
          user_id?: string | null
        }
        Update: {
          api_key?: string
          birth_date?: string
          birth_time?: string
          city?: string
          country?: string
          created_at?: string | null
          endpoint_called?: string
          error_message?: string | null
          log_id?: string
          second_birth_date?: string | null
          second_birth_time?: string | null
          second_city?: string | null
          second_country?: string | null
          status?: string
          system?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_users: {
        Row: {
          addon_relationship_compatibility: boolean | null
          addon_transit_12_months: boolean | null
          addon_yearly_cycle: boolean | null
          api_call_limit: number | null
          api_calls_count: number | null
          api_key: string
          created_at: string | null
          email: string
          id: string
          plan_name: string | null
          stripe_customer_id: string
          updated_at: string | null
        }
        Insert: {
          addon_relationship_compatibility?: boolean | null
          addon_transit_12_months?: boolean | null
          addon_yearly_cycle?: boolean | null
          api_call_limit?: number | null
          api_calls_count?: number | null
          api_key: string
          created_at?: string | null
          email: string
          id: string
          plan_name?: string | null
          stripe_customer_id: string
          updated_at?: string | null
        }
        Update: {
          addon_relationship_compatibility?: boolean | null
          addon_transit_12_months?: boolean | null
          addon_yearly_cycle?: boolean | null
          api_call_limit?: number | null
          api_calls_count?: number | null
          api_key?: string
          created_at?: string | null
          email?: string
          id?: string
          plan_name?: string | null
          stripe_customer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_stripe_customer_id_fkey"
            columns: ["stripe_customer_id"]
            isOneToOne: false
            referencedRelation: "stripe_users"
            referencedColumns: ["stripe_customer_id"]
          },
        ]
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
      plans: {
        Row: {
          active: boolean
          api_call_limit: number
          created_at: string
          features: Json
          id: string
          name: string
          price_per_month: number
        }
        Insert: {
          active?: boolean
          api_call_limit: number
          created_at?: string
          features: Json
          id?: string
          name: string
          price_per_month: number
        }
        Update: {
          active?: boolean
          api_call_limit?: number
          created_at?: string
          features?: Json
          id?: string
          name?: string
          price_per_month?: number
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
      users: {
        Row: {
          addon_relationship: boolean
          addon_transits: boolean
          addon_yearly_cycle: boolean
          calls_limit: number
          calls_made: number
          created_at: string
          email: string
          id: string
          plan_id: string | null
          plan_type: string
          status: string
          stripe_customer_id: string | null
        }
        Insert: {
          addon_relationship?: boolean
          addon_transits?: boolean
          addon_yearly_cycle?: boolean
          calls_limit?: number
          calls_made?: number
          created_at?: string
          email: string
          id: string
          plan_id?: string | null
          plan_type?: string
          status: string
          stripe_customer_id?: string | null
        }
        Update: {
          addon_relationship?: boolean
          addon_transits?: boolean
          addon_yearly_cycle?: boolean
          calls_limit?: number
          calls_made?: number
          created_at?: string
          email?: string
          id?: string
          plan_id?: string | null
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      toggle_addon: {
        Args: { user_id_param: string; addon_name: string; enabled: boolean }
        Returns: undefined
      }
      upgrade_plan: {
        Args: { user_id_param: string; new_plan: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
