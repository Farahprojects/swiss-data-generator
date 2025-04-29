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
      api_endpoints: {
        Row: {
          created_at: string | null
          endpoint_name: string
          endpoint_path: string
          id: string
          pricing_type: string
          requires_ai: boolean
          system: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint_name: string
          endpoint_path: string
          id?: string
          pricing_type: string
          requires_ai?: boolean
          system: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint_name?: string
          endpoint_path?: string
          id?: string
          pricing_type?: string
          requires_ai?: boolean
          system?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
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
          ai_used: boolean | null
          created_at: string | null
          endpoint_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          ai_used?: boolean | null
          created_at?: string | null
          endpoint_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          ai_used?: boolean | null
          created_at?: string | null
          endpoint_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
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
      stripe_products: {
        Row: {
          active: boolean
          created_at: string | null
          currency: string
          id: string
          interval: string
          limits: number | null
          price_amount: number
          product_name: string
          stripe_price_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          currency?: string
          id?: string
          interval?: string
          limits?: number | null
          price_amount: number
          product_name: string
          stripe_price_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          currency?: string
          id?: string
          interval?: string
          limits?: number | null
          price_amount?: number
          product_name?: string
          stripe_price_id?: string
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
      subscriptions: {
        Row: {
          add_on_relationship_price_id: string | null
          add_on_relationship_status: string | null
          add_on_transits_price_id: string | null
          add_on_transits_status: string | null
          add_on_yearly_cycle_price_id: string | null
          add_on_yearly_cycle_status: string | null
          ai_credit_balance: number | null
          created_at: string | null
          current_period_end: string | null
          id: string
          main_plan_name: string | null
          main_plan_price_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          add_on_relationship_price_id?: string | null
          add_on_relationship_status?: string | null
          add_on_transits_price_id?: string | null
          add_on_transits_status?: string | null
          add_on_yearly_cycle_price_id?: string | null
          add_on_yearly_cycle_status?: string | null
          ai_credit_balance?: number | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          main_plan_name?: string | null
          main_plan_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          add_on_relationship_price_id?: string | null
          add_on_relationship_status?: string | null
          add_on_transits_price_id?: string | null
          add_on_transits_status?: string | null
          add_on_yearly_cycle_price_id?: string | null
          add_on_yearly_cycle_status?: string | null
          ai_credit_balance?: number | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          main_plan_name?: string | null
          main_plan_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
