export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          logs: string | null
          meta: Json | null
          page: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          logs?: string | null
          meta?: Json | null
          page: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          logs?: string | null
          meta?: Json | null
          page?: string
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
          request_params: Json | null
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
          request_params?: Json | null
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
          request_params?: Json | null
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
      blog_posts: {
        Row: {
          author_name: string | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          id: string
          like_count: number | null
          published: boolean | null
          share_count: number | null
          slug: string
          tags: string[] | null
          title: string
        }
        Insert: {
          author_name?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          like_count?: number | null
          published?: boolean | null
          share_count?: number | null
          slug: string
          tags?: string[] | null
          title: string
        }
        Update: {
          author_name?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          like_count?: number | null
          published?: boolean | null
          share_count?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      calendar_sessions: {
        Row: {
          client_id: string | null
          coach_id: string
          color_tag: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          coach_id: string
          color_tag?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          coach_id?: string
          color_tag?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_audio_clips: {
        Row: {
          audio_url: string
          chat_id: string
          created_at: string
          duration_ms: number | null
          id: string
          message_id: string | null
          meta: Json
          mime_type: string
          provider: string
          role: string
          session_id: string | null
          storage_path: string | null
          text: string | null
          voice: string | null
        }
        Insert: {
          audio_url: string
          chat_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          message_id?: string | null
          meta?: Json
          mime_type?: string
          provider?: string
          role?: string
          session_id?: string | null
          storage_path?: string | null
          text?: string | null
          voice?: string | null
        }
        Update: {
          audio_url?: string
          chat_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          message_id?: string | null
          meta?: Json
          mime_type?: string
          provider?: string
          role?: string
          session_id?: string | null
          storage_path?: string | null
          text?: string | null
          voice?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          birth_location: string | null
          birth_time: string | null
          coach_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_location?: string | null
          birth_time?: string | null
          coach_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_location?: string | null
          birth_time?: string | null
          coach_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          brand_color: string | null
          business_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          logo_url: string | null
          phone: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          brand_color?: string | null
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          brand_color?: string | null
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      coach_websites: {
        Row: {
          coach_id: string
          created_at: string
          customization_data: Json
          draft_customization_data: Json | null
          has_unpublished_changes: boolean | null
          id: string
          is_published: boolean
          published_at: string | null
          site_slug: string
          template_id: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          customization_data?: Json
          draft_customization_data?: Json | null
          has_unpublished_changes?: boolean | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          site_slug: string
          template_id: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          customization_data?: Json
          draft_customization_data?: Json | null
          has_unpublished_changes?: boolean | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          site_slug?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_websites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "website_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          inserted_at: string | null
          label: string | null
          message: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          inserted_at?: string | null
          label?: string | null
          message?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          inserted_at?: string | null
          label?: string | null
          message?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          ip_address: string
          is_blocked: boolean | null
          request_id: string
          status_code: number
          token_hash: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          ip_address: string
          is_blocked?: boolean | null
          request_id: string
          status_code: number
          token_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          ip_address?: string
          is_blocked?: boolean | null
          request_id?: string
          status_code?: number
          token_hash?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string | null
          direction: string
          from_address: string
          id: string
          is_archived: boolean
          is_read: boolean
          is_starred: boolean
          raw_headers: string | null
          sent_via: string | null
          subject: string | null
          to_address: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string | null
          direction: string
          from_address: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          is_starred?: boolean
          raw_headers?: string | null
          sent_via?: string | null
          subject?: string | null
          to_address: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string | null
          direction?: string
          from_address?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          is_starred?: boolean
          raw_headers?: string | null
          sent_via?: string | null
          subject?: string | null
          to_address?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_templates: {
        Row: {
          body_html: string
          body_text: string
          created_at: string
          id: string
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text: string
          created_at?: string
          id?: string
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string
          created_at?: string
          id?: string
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_signatures: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          signature_html: string
          signature_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          signature_html: string
          signature_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          signature_html?: string
          signature_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_template: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject_template: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_template: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject_template: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_template?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      geo_cache: {
        Row: {
          lat: number
          lon: number
          place: string | null
          place_id: string
          updated_at: string | null
        }
        Insert: {
          lat: number
          lon: number
          place?: string | null
          place_id: string
          updated_at?: string | null
        }
        Update: {
          lat?: number
          lon?: number
          place?: string | null
          place_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guest_reports: {
        Row: {
          amount_paid: number
          chat_id: string
          checkout_url: string | null
          created_at: string
          email: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          is_ai_report: boolean | null
          payment_status: string
          promo_code_used: string | null
          purchase_type: string | null
          report_data: Json
          report_generated: boolean | null
          report_type: string | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          chat_id?: string
          checkout_url?: string | null
          created_at?: string
          email: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_ai_report?: boolean | null
          payment_status?: string
          promo_code_used?: string | null
          purchase_type?: string | null
          report_data?: Json
          report_generated?: boolean | null
          report_type?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          chat_id?: string
          checkout_url?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          is_ai_report?: boolean | null
          payment_status?: string
          promo_code_used?: string | null
          purchase_type?: string | null
          report_data?: Json
          report_generated?: boolean | null
          report_type?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      insight_entries: {
        Row: {
          client_id: string
          coach_id: string
          confidence_score: number | null
          content: string
          created_at: string
          id: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          confidence_score?: number | null
          content: string
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          confidence_score?: number | null
          content?: string
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_insight_entries_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          prompt_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      ip_allowlist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          entry_text: string
          id: string
          linked_report_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          entry_text: string
          id?: string
          linked_report_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          entry_text?: string
          id?: string
          linked_report_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_config: {
        Row: {
          created_at: string
          feature_images: Json
          features_images: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_images?: Json
          features_images?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_images?: Json
          features_images?: Json
          id?: string
          updated_at?: string
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
      messages: {
        Row: {
          chat_id: string
          client_msg_id: string | null
          context_injected: boolean | null
          created_at: string
          error: Json | null
          id: string
          latency_ms: number | null
          meta: Json
          model: string | null
          reply_to_id: string | null
          role: string
          status: string | null
          text: string | null
          token_count: number | null
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          client_msg_id?: string | null
          context_injected?: boolean | null
          created_at?: string
          error?: Json | null
          id?: string
          latency_ms?: number | null
          meta?: Json
          model?: string | null
          reply_to_id?: string | null
          role: string
          status?: string | null
          text?: string | null
          token_count?: number | null
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          client_msg_id?: string | null
          context_injected?: boolean | null
          created_at?: string
          error?: Json | null
          id?: string
          latency_ms?: number | null
          meta?: Json
          model?: string | null
          reply_to_id?: string | null
          role?: string
          status?: string | null
          text?: string | null
          token_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method: {
        Row: {
          active: boolean | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_name: string | null
          card_brand: string | null
          card_last4: string | null
          city: string | null
          country: string | null
          email: string | null
          exp_month: number | null
          exp_year: number | null
          fingerprint: string | null
          id: number
          payment_method_type: string | null
          payment_status: string | null
          postal_code: string | null
          state: string | null
          status_changed_at: string | null
          status_reason: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          stripe_pid: string | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_name?: string | null
          card_brand?: string | null
          card_last4?: string | null
          city?: string | null
          country?: string | null
          email?: string | null
          exp_month?: number | null
          exp_year?: number | null
          fingerprint?: string | null
          id?: number
          payment_method_type?: string | null
          payment_status?: string | null
          postal_code?: string | null
          state?: string | null
          status_changed_at?: string | null
          status_reason?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_pid?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_name?: string | null
          card_brand?: string | null
          card_last4?: string | null
          city?: string | null
          country?: string | null
          email?: string | null
          exp_month?: number | null
          exp_year?: number | null
          fingerprint?: string | null
          id?: number
          payment_method_type?: string | null
          payment_status?: string | null
          postal_code?: string | null
          state?: string | null
          status_changed_at?: string | null
          status_reason?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_pid?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      price_list: {
        Row: {
          created_at: string | null
          description: string | null
          endpoint: string | null
          id: string
          is_ai: string | null
          name: string
          product_code: string | null
          report_type: string | null
          unit_price_usd: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          id: string
          is_ai?: string | null
          name: string
          product_code?: string | null
          report_type?: string | null
          unit_price_usd: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          id?: string
          is_ai?: string | null
          name?: string
          product_code?: string | null
          report_type?: string | null
          unit_price_usd?: number
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          discount_percent: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          times_used: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_percent: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          times_used?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          times_used?: number | null
        }
        Relationships: []
      }
      rate_limit_rules: {
        Row: {
          block_duration_seconds: number
          created_at: string | null
          function_name: string
          id: string
          is_active: boolean | null
          max_hits: number
          updated_at: string | null
          window_seconds: number
        }
        Insert: {
          block_duration_seconds?: number
          created_at?: string | null
          function_name: string
          id?: string
          is_active?: boolean | null
          max_hits?: number
          updated_at?: string | null
          window_seconds?: number
        }
        Update: {
          block_duration_seconds?: number
          created_at?: string | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          max_hits?: number
          updated_at?: string | null
          window_seconds?: number
        }
        Relationships: []
      }
      report_logs: {
        Row: {
          api_key: string | null
          client_id: string | null
          created_at: string | null
          duration_ms: number | null
          endpoint: string | null
          engine_used: string | null
          error_message: string | null
          has_error: boolean
          id: string
          is_guest: boolean | null
          metadata: Json | null
          report_text: string | null
          report_type: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          client_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          endpoint?: string | null
          engine_used?: string | null
          error_message?: string | null
          has_error?: boolean
          id?: string
          is_guest?: boolean | null
          metadata?: Json | null
          report_text?: string | null
          report_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          client_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          endpoint?: string | null
          engine_used?: string | null
          error_message?: string | null
          has_error?: boolean
          id?: string
          is_guest?: boolean | null
          metadata?: Json | null
          report_text?: string | null
          report_type?: string | null
          status?: string | null
          user_id?: string | null
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
      report_ready_signals: {
        Row: {
          created_at: string | null
          guest_report_id: string
          id: string
          is_ai_report: boolean | null
          seen: boolean
        }
        Insert: {
          created_at?: string | null
          guest_report_id: string
          id?: string
          is_ai_report?: boolean | null
          seen?: boolean
        }
        Update: {
          created_at?: string | null
          guest_report_id?: string
          id?: string
          is_ai_report?: boolean | null
          seen?: boolean
        }
        Relationships: []
      }
      service_purchases: {
        Row: {
          amount_cents: number
          coach_id: string | null
          coach_payout_cents: number
          coach_slug: string
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          payment_status: string
          platform_fee_cents: number
          purchase_metadata: Json | null
          receipt_url: string | null
          service_description: string | null
          service_price_original: string
          service_title: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          coach_id?: string | null
          coach_payout_cents?: number
          coach_slug: string
          completed_at?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          payment_status?: string
          platform_fee_cents?: number
          purchase_metadata?: Json | null
          receipt_url?: string | null
          service_description?: string | null
          service_price_original: string
          service_title: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          coach_id?: string | null
          coach_payout_cents?: number
          coach_slug?: string
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          payment_status?: string
          platform_fee_cents?: number
          purchase_metadata?: Json | null
          receipt_url?: string | null
          service_description?: string | null
          service_price_original?: string
          service_title?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          updated_at?: string
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
          stripe_kind: string
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
          stripe_kind: string
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
          stripe_kind?: string
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
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      temp_audio: {
        Row: {
          audio_data: string
          created_at: string | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          audio_data: string
          created_at?: string | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          audio_data?: string
          created_at?: string | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      temp_report_data: {
        Row: {
          chat_hash: string | null
          created_at: string | null
          expires_at: string | null
          guest_report_id: string | null
          id: string
          last_save_attempt_at: string | null
          metadata: Json | null
          plain_token: string | null
          report_content: string | null
          swiss_data: Json | null
          swiss_data_save_attempts: number | null
          swiss_data_save_pending: boolean | null
          swiss_data_saved: boolean | null
          token_hash: string | null
        }
        Insert: {
          chat_hash?: string | null
          created_at?: string | null
          expires_at?: string | null
          guest_report_id?: string | null
          id?: string
          last_save_attempt_at?: string | null
          metadata?: Json | null
          plain_token?: string | null
          report_content?: string | null
          swiss_data?: Json | null
          swiss_data_save_attempts?: number | null
          swiss_data_save_pending?: boolean | null
          swiss_data_saved?: boolean | null
          token_hash?: string | null
        }
        Update: {
          chat_hash?: string | null
          created_at?: string | null
          expires_at?: string | null
          guest_report_id?: string | null
          id?: string
          last_save_attempt_at?: string | null
          metadata?: Json | null
          plain_token?: string | null
          report_content?: string | null
          swiss_data?: Json | null
          swiss_data_save_attempts?: number | null
          swiss_data_save_pending?: boolean | null
          swiss_data_saved?: boolean | null
          token_hash?: string | null
        }
        Relationships: []
      }
      token_emails: {
        Row: {
          body_html: string
          body_text: string
          created_at: string | null
          id: string
          subject: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text: string
          created_at?: string | null
          id?: string
          subject: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string
          created_at?: string | null
          id?: string
          subject?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      topup_logs: {
        Row: {
          amount_cents: number
          created_at: string | null
          credited: boolean | null
          id: string
          receipt_url: string | null
          status: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          credited?: boolean | null
          id?: string
          receipt_url?: string | null
          status: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          credited?: boolean | null
          id?: string
          receipt_url?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      topup_queue: {
        Row: {
          amount_usd: number
          id: string
          message: string | null
          processed_at: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          id?: string
          message?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          id?: string
          message?: string | null
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      translator_logs: {
        Row: {
          client_id: string | null
          created_at: string | null
          error_message: string | null
          google_geo: boolean | null
          id: string
          is_archived: boolean
          is_guest: boolean
          processing_time_ms: number | null
          report_tier: string | null
          request_payload: Json | null
          request_type: string | null
          response_status: number | null
          swiss_data: Json | null
          swiss_error: boolean | null
          translator_payload: Json | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          google_geo?: boolean | null
          id?: string
          is_archived?: boolean
          is_guest?: boolean
          processing_time_ms?: number | null
          report_tier?: string | null
          request_payload?: Json | null
          request_type?: string | null
          response_status?: number | null
          swiss_data?: Json | null
          swiss_error?: boolean | null
          translator_payload?: Json | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          google_geo?: boolean | null
          id?: string
          is_archived?: boolean
          is_guest?: boolean
          processing_time_ms?: number | null
          report_tier?: string | null
          request_payload?: Json | null
          request_type?: string | null
          response_status?: number | null
          swiss_data?: Json | null
          swiss_error?: boolean | null
          translator_payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translator_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      user_errors: {
        Row: {
          case_number: string
          created_at: string
          email: string
          error_message: string | null
          error_type: string
          guest_report_id: string | null
          id: string
          metadata: Json | null
          price_paid: number | null
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          case_number?: string
          created_at?: string
          email: string
          error_message?: string | null
          error_type?: string
          guest_report_id?: string | null
          id?: string
          metadata?: Json | null
          price_paid?: number | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          case_number?: string
          created_at?: string
          email?: string
          error_message?: string | null
          error_type?: string
          guest_report_id?: string | null
          id?: string
          metadata?: Json | null
          price_paid?: number | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          client_view_mode: string | null
          created_at: string
          email_change_notifications: boolean | null
          email_notifications_enabled: boolean | null
          id: string
          password_change_notifications: boolean | null
          security_alert_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_view_mode?: string | null
          created_at?: string
          email_change_notifications?: boolean | null
          email_notifications_enabled?: boolean | null
          id?: string
          password_change_notifications?: boolean | null
          security_alert_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_view_mode?: string | null
          created_at?: string
          email_change_notifications?: boolean | null
          email_notifications_enabled?: boolean | null
          id?: string
          password_change_notifications?: boolean | null
          security_alert_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      website_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          preview_image_url: string | null
          template_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          preview_image_url?: string | null
          template_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          preview_image_url?: string | null
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_credits: {
        Args: {
          _amount_usd: number
          _description?: string
          _stripe_pid?: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      check_report_logs_constraints: {
        Args: Record<PropertyKey, never>
        Returns: {
          column_default: string
          column_name: string
          constraint_definition: string
          constraint_name: string
          constraint_type: string
          data_type: string
          is_nullable: string
          udt_name: string
        }[]
      }
      check_user_admin_role: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      clean_completed_topups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_user_after_payment: {
        Args: { plan_type?: string; user_id: string }
        Returns: undefined
      }
      delete_user_account: {
        Args: { user_id_to_delete: string }
        Returns: boolean
      }
      gen_random_bytes: {
        Args: { "": number }
        Returns: string
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_users_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          balance_usd: number
          created_at: string
          email: string
          email_confirmed_at: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
      get_flow_status: {
        Args: { user_email: string }
        Returns: {
          created_at: string
          flow_state: string
          session_id: string
          updated_at: string
        }[]
      }
      get_next_engine_sequence: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_stripe_customer_id_for_user: {
        Args: { user_id_param: string }
        Returns: {
          stripe_customer_id: string
          stripe_payment_method_id: string
        }[]
      }
      get_user_email_by_id: {
        Args: { user_id_param: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id?: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_user_balance: {
        Args: { amount_param: number; user_id_param: string }
        Returns: undefined
      }
      record_api_usage: {
        Args: {
          _cost_usd: number
          _endpoint: string
          _processing_time_ms?: number
          _request_params?: Json
          _response_status?: number
          _user_id: string
        }
        Returns: string
      }
      rpc_notify_orchestrator: {
        Args: { guest_report_id: string }
        Returns: undefined
      }
      send_notification_email: {
        Args: {
          recipient_email: string
          template_type: string
          variables?: Json
        }
        Returns: boolean
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      toggle_addon: {
        Args: { addon_name: string; enabled: boolean; user_id_param: string }
        Returns: undefined
      }
      upgrade_plan: {
        Args: { new_plan: string; user_id_param: string }
        Returns: undefined
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      queue_status: "pending" | "processing" | "completed" | "failed"
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      queue_status: ["pending", "processing", "completed", "failed"],
      user_role: ["admin", "user"],
    },
  },
} as const
