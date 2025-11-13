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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_user_id: string | null
          approver_id: string | null
          approver_name: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          approver_id?: string | null
          approver_name?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          approver_id?: string | null
          approver_name?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "client_approvers"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string
          email: string | null
          email_encrypted: string | null
          id: string
          last_payment_date: string | null
          logo_url: string | null
          name: string
          plan: string | null
          plan_renewal_date: string | null
          plan_type: string | null
          slug: string
          updated_at: string
          webhook_url: string | null
          webhook_url_encrypted: string | null
          whatsapp: string | null
          whatsapp_encrypted: string | null
        }
        Insert: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          email?: string | null
          email_encrypted?: string | null
          id?: string
          last_payment_date?: string | null
          logo_url?: string | null
          name: string
          plan?: string | null
          plan_renewal_date?: string | null
          plan_type?: string | null
          slug: string
          updated_at?: string
          webhook_url?: string | null
          webhook_url_encrypted?: string | null
          whatsapp?: string | null
          whatsapp_encrypted?: string | null
        }
        Update: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          email?: string | null
          email_encrypted?: string | null
          id?: string
          last_payment_date?: string | null
          logo_url?: string | null
          name?: string
          plan?: string | null
          plan_renewal_date?: string | null
          plan_type?: string | null
          slug?: string
          updated_at?: string
          webhook_url?: string | null
          webhook_url_encrypted?: string | null
          whatsapp?: string | null
          whatsapp_encrypted?: string | null
        }
        Relationships: []
      }
      approval_tokens: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          month: string
          token: string
          used_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          month: string
          token: string
          used_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          month?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_tokens_backup: {
        Row: {
          backup_date: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string | null
          month: string | null
          token: string | null
          used_at: string | null
        }
        Insert: {
          backup_date?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string | null
          month?: string | null
          token?: string | null
          used_at?: string | null
        }
        Update: {
          backup_date?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string | null
          month?: string | null
          token?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      client_approvers: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          name: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_approvers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          note: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          note: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sessions: {
        Row: {
          approver_id: string
          client_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          approver_id: string
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          approver_id?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sessions_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "client_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_social_accounts: {
        Row: {
          access_token_encrypted: string
          account_id: string
          account_name: string
          client_id: string
          created_at: string
          id: string
          instagram_business_account_id: string | null
          is_active: boolean
          page_id: string | null
          platform: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          account_id: string
          account_name: string
          client_id: string
          created_at?: string
          id?: string
          instagram_business_account_id?: string | null
          is_active?: boolean
          page_id?: string | null
          platform: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          account_id?: string
          account_name?: string
          client_id?: string
          created_at?: string
          id?: string
          instagram_business_account_id?: string | null
          is_active?: boolean
          page_id?: string | null
          platform?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          agency_id: string
          cnpj: string | null
          created_at: string
          email: string | null
          email_encrypted: string | null
          id: string
          logo_url: string | null
          monthly_creatives: number | null
          name: string
          notify_email: boolean | null
          notify_webhook: boolean | null
          notify_whatsapp: boolean | null
          plan_renewal_date: string | null
          responsible_user_id: string | null
          slug: string
          timezone: string | null
          updated_at: string
          webhook_url: string | null
          webhook_url_encrypted: string | null
          website: string | null
          whatsapp: string | null
          whatsapp_encrypted: string | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          email_encrypted?: string | null
          id?: string
          logo_url?: string | null
          monthly_creatives?: number | null
          name: string
          notify_email?: boolean | null
          notify_webhook?: boolean | null
          notify_whatsapp?: boolean | null
          plan_renewal_date?: string | null
          responsible_user_id?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string
          webhook_url?: string | null
          webhook_url_encrypted?: string | null
          website?: string | null
          whatsapp?: string | null
          whatsapp_encrypted?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          email_encrypted?: string | null
          id?: string
          logo_url?: string | null
          monthly_creatives?: number | null
          name?: string
          notify_email?: boolean | null
          notify_webhook?: boolean | null
          notify_whatsapp?: boolean | null
          plan_renewal_date?: string | null
          responsible_user_id?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string
          webhook_url?: string | null
          webhook_url_encrypted?: string | null
          website?: string | null
          whatsapp?: string | null
          whatsapp_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_responsible_user"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          adjustment_reason: string | null
          approver_id: string | null
          approver_name: string | null
          author_user_id: string | null
          body: string
          content_id: string
          created_at: string
          id: string
          is_adjustment_request: boolean | null
          version: number
        }
        Insert: {
          adjustment_reason?: string | null
          approver_id?: string | null
          approver_name?: string | null
          author_user_id?: string | null
          body: string
          content_id: string
          created_at?: string
          id?: string
          is_adjustment_request?: boolean | null
          version: number
        }
        Update: {
          adjustment_reason?: string | null
          approver_id?: string | null
          approver_name?: string | null
          author_user_id?: string | null
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          is_adjustment_request?: boolean | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "client_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          accepted_at: string
          client_id: string | null
          id: string
          ip: string | null
          legal_basis: Database["public"]["Enums"]["legal_basis"]
          user_id: string
        }
        Insert: {
          accepted_at?: string
          client_id?: string | null
          id?: string
          ip?: string | null
          legal_basis: Database["public"]["Enums"]["legal_basis"]
          user_id: string
        }
        Update: {
          accepted_at?: string
          client_id?: string | null
          id?: string
          ip?: string | null
          legal_basis?: Database["public"]["Enums"]["legal_basis"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_media: {
        Row: {
          content_id: string
          converted: boolean
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          order_index: number
          size_bytes: number | null
          src_url: string
          thumb_url: string | null
        }
        Insert: {
          content_id: string
          converted?: boolean
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          order_index?: number
          size_bytes?: number | null
          src_url: string
          thumb_url?: string | null
        }
        Update: {
          content_id?: string
          converted?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          order_index?: number
          size_bytes?: number | null
          src_url?: string
          thumb_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_suggestions_feedback: {
        Row: {
          client_id: string
          context: Json | null
          created_at: string | null
          event_title: string
          event_type: string
          id: string
          used_at: string | null
        }
        Insert: {
          client_id: string
          context?: Json | null
          created_at?: string | null
          event_title: string
          event_type: string
          id?: string
          used_at?: string | null
        }
        Update: {
          client_id?: string
          context?: Json | null
          created_at?: string | null
          event_title?: string
          event_type?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_suggestions_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_suggestions_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_suggestions_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      content_texts: {
        Row: {
          caption: string | null
          content_id: string
          created_at: string
          edited_at: string | null
          edited_by_approver_id: string | null
          edited_by_approver_name: string | null
          edited_by_user_id: string | null
          id: string
          version: number
        }
        Insert: {
          caption?: string | null
          content_id: string
          created_at?: string
          edited_at?: string | null
          edited_by_approver_id?: string | null
          edited_by_approver_name?: string | null
          edited_by_user_id?: string | null
          id?: string
          version: number
        }
        Update: {
          caption?: string | null
          content_id?: string
          created_at?: string
          edited_at?: string | null
          edited_by_approver_id?: string | null
          edited_by_approver_name?: string | null
          edited_by_user_id?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_texts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_texts_edited_by_approver_id_fkey"
            columns: ["edited_by_approver_id"]
            isOneToOne: false
            referencedRelation: "client_approvers"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          auto_publish: boolean | null
          category: string | null
          channels: string[] | null
          client_id: string
          created_at: string
          date: string
          deadline: string | null
          id: string
          is_content_plan: boolean | null
          owner_user_id: string
          plan_description: string | null
          publish_error: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          supplier_link: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          version: number
        }
        Insert: {
          auto_publish?: boolean | null
          category?: string | null
          channels?: string[] | null
          client_id: string
          created_at?: string
          date: string
          deadline?: string | null
          id?: string
          is_content_plan?: boolean | null
          owner_user_id: string
          plan_description?: string | null
          publish_error?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          supplier_link?: string | null
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          auto_publish?: boolean | null
          category?: string | null
          channels?: string[] | null
          client_id?: string
          created_at?: string
          date?: string
          deadline?: string | null
          id?: string
          is_content_plan?: boolean | null
          owner_user_id?: string
          plan_description?: string | null
          publish_error?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          supplier_link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          content_category: string | null
          content_ids: string[] | null
          content_type: string | null
          created_at: string | null
          currency: string | null
          event_id: string
          event_name: string
          event_source_url: string | null
          event_time: string
          id: string
          metadata: Json | null
          num_items: number | null
          platforms: string[] | null
          send_status: Json | null
          subscription_plan: string | null
          subscription_value: number | null
          user_agent: string | null
          user_email_hash: string | null
          user_external_id: string | null
          user_id: string | null
          user_ip: string | null
          user_phone_hash: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
        }
        Insert: {
          content_category?: string | null
          content_ids?: string[] | null
          content_type?: string | null
          created_at?: string | null
          currency?: string | null
          event_id: string
          event_name: string
          event_source_url?: string | null
          event_time: string
          id?: string
          metadata?: Json | null
          num_items?: number | null
          platforms?: string[] | null
          send_status?: Json | null
          subscription_plan?: string | null
          subscription_value?: number | null
          user_agent?: string | null
          user_email_hash?: string | null
          user_external_id?: string | null
          user_id?: string | null
          user_ip?: string | null
          user_phone_hash?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
        }
        Update: {
          content_category?: string | null
          content_ids?: string[] | null
          content_type?: string | null
          created_at?: string | null
          currency?: string | null
          event_id?: string
          event_name?: string
          event_source_url?: string | null
          event_time?: string
          id?: string
          metadata?: Json | null
          num_items?: number | null
          platforms?: string[] | null
          send_status?: Json | null
          subscription_plan?: string | null
          subscription_value?: number | null
          user_agent?: string | null
          user_email_hash?: string | null
          user_external_id?: string | null
          user_id?: string | null
          user_ip?: string | null
          user_phone_hash?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
        }
        Relationships: []
      }
      financial_snapshots: {
        Row: {
          average_ticket_brl: number | null
          cancellations_this_month: number | null
          churn_rate: number | null
          created_at: string | null
          creator_count: number | null
          creator_mrr: number | null
          eugencia_count: number | null
          eugencia_mrr: number | null
          fullservice_count: number | null
          fullservice_mrr: number | null
          id: string
          projected_mrr_next_month: number | null
          projected_new_clients: number | null
          snapshot_date: string
          socialmidia_count: number | null
          socialmidia_mrr: number | null
          total_active_subscriptions: number | null
          total_mrr: number | null
          unlimited_count: number | null
          unlimited_mrr: number | null
        }
        Insert: {
          average_ticket_brl?: number | null
          cancellations_this_month?: number | null
          churn_rate?: number | null
          created_at?: string | null
          creator_count?: number | null
          creator_mrr?: number | null
          eugencia_count?: number | null
          eugencia_mrr?: number | null
          fullservice_count?: number | null
          fullservice_mrr?: number | null
          id?: string
          projected_mrr_next_month?: number | null
          projected_new_clients?: number | null
          snapshot_date?: string
          socialmidia_count?: number | null
          socialmidia_mrr?: number | null
          total_active_subscriptions?: number | null
          total_mrr?: number | null
          unlimited_count?: number | null
          unlimited_mrr?: number | null
        }
        Update: {
          average_ticket_brl?: number | null
          cancellations_this_month?: number | null
          churn_rate?: number | null
          created_at?: string | null
          creator_count?: number | null
          creator_mrr?: number | null
          eugencia_count?: number | null
          eugencia_mrr?: number | null
          fullservice_count?: number | null
          fullservice_mrr?: number | null
          id?: string
          projected_mrr_next_month?: number | null
          projected_new_clients?: number | null
          snapshot_date?: string
          socialmidia_count?: number | null
          socialmidia_mrr?: number | null
          total_active_subscriptions?: number | null
          total_mrr?: number | null
          unlimited_count?: number | null
          unlimited_mrr?: number | null
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          agency_id: string
          column_color: string
          column_id: string
          column_name: string
          column_order: number
          created_at: string | null
          id: string
          is_system: boolean | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          column_color?: string
          column_id: string
          column_name: string
          column_order: number
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          column_color?: string
          column_id?: string
          column_name?: string
          column_order?: number
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_columns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_columns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_pages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          page_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          page_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      lovable_plan_config: {
        Row: {
          created_at: string | null
          database_overage_cost_per_gb_month: number | null
          database_quota_mb: number
          egress_overage_cost_per_gb: number | null
          egress_quota_gb: number
          id: string
          is_active: boolean | null
          notes: string | null
          plan_name: string
          storage_overage_cost_per_gb: number | null
          storage_quota_gb: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          database_overage_cost_per_gb_month?: number | null
          database_quota_mb: number
          egress_overage_cost_per_gb?: number | null
          egress_quota_gb: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_name: string
          storage_overage_cost_per_gb?: number | null
          storage_quota_gb: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          database_overage_cost_per_gb_month?: number | null
          database_quota_mb?: number
          egress_overage_cost_per_gb?: number | null
          egress_quota_gb?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_name?: string
          storage_overage_cost_per_gb?: number | null
          storage_quota_gb?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          agency_id: string | null
          channel: string | null
          client_id: string | null
          content_id: string | null
          created_at: string | null
          error_message: string | null
          event: string
          id: string
          payload: Json | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          channel?: string | null
          client_id?: string | null
          content_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event: string
          id?: string
          payload?: Json | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          channel?: string | null
          client_id?: string | null
          content_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event?: string
          id?: string
          payload?: Json | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_costs: {
        Row: {
          category: string | null
          cost_name: string
          cost_type: string | null
          cost_value: number
          created_at: string | null
          id: string
          is_fixed: boolean
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_name: string
          cost_type?: string | null
          cost_value?: number
          created_at?: string | null
          id?: string
          is_fixed?: boolean
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_name?: string
          cost_type?: string | null
          cost_value?: number
          created_at?: string | null
          id?: string
          is_fixed?: boolean
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          created_at: string | null
          creatives_limit: number | null
          global_agenda: boolean | null
          graphics_approval: boolean | null
          history_days: number
          id: string
          plan: string
          posts_limit: number | null
          supplier_link: boolean | null
          team_kanban: boolean | null
          team_members_limit: number | null
          team_notifications: boolean | null
          updated_at: string | null
          whatsapp_support: boolean | null
        }
        Insert: {
          created_at?: string | null
          creatives_limit?: number | null
          global_agenda?: boolean | null
          graphics_approval?: boolean | null
          history_days: number
          id?: string
          plan: string
          posts_limit?: number | null
          supplier_link?: boolean | null
          team_kanban?: boolean | null
          team_members_limit?: number | null
          team_notifications?: boolean | null
          updated_at?: string | null
          whatsapp_support?: boolean | null
        }
        Update: {
          created_at?: string | null
          creatives_limit?: number | null
          global_agenda?: boolean | null
          graphics_approval?: boolean | null
          history_days?: number
          id?: string
          plan?: string
          posts_limit?: number | null
          supplier_link?: boolean | null
          team_kanban?: boolean | null
          team_members_limit?: number | null
          team_notifications?: boolean | null
          updated_at?: string | null
          whatsapp_support?: boolean | null
        }
        Relationships: []
      }
      plan_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          permission_key: string
          plan: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          permission_key: string
          plan: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          permission_key?: string
          plan?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          created_by: string | null
          deduplication_key: string | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          payload: Json | null
          priority: string | null
          read_at: string | null
          send_email: boolean | null
          send_in_app: boolean | null
          send_whatsapp: boolean | null
          sent_at: string | null
          status: string
          target_id: string | null
          target_type: string
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deduplication_key?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          payload?: Json | null
          priority?: string | null
          read_at?: string | null
          send_email?: boolean | null
          send_in_app?: boolean | null
          send_whatsapp?: boolean | null
          sent_at?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deduplication_key?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          payload?: Json | null
          priority?: string | null
          read_at?: string | null
          send_email?: boolean | null
          send_in_app?: boolean | null
          send_whatsapp?: boolean | null
          sent_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          account_type: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          agency_id: string | null
          agency_name: string | null
          billing_cycle: string | null
          blocked_by_parent: boolean
          client_id: string | null
          created_at: string
          current_period_end: string | null
          delinquent: boolean | null
          document: string | null
          grace_period_end: string | null
          id: string
          instagram_handle: string | null
          instagram_verified: boolean | null
          is_active: boolean
          is_pro: boolean | null
          name: string
          plan: string | null
          plan_renewal_date: string | null
          responsible_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          selected_plan: string | null
          skip_subscription_check: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          accepted_terms_at?: string | null
          account_type?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          agency_id?: string | null
          agency_name?: string | null
          billing_cycle?: string | null
          blocked_by_parent?: boolean
          client_id?: string | null
          created_at?: string
          current_period_end?: string | null
          delinquent?: boolean | null
          document?: string | null
          grace_period_end?: string | null
          id: string
          instagram_handle?: string | null
          instagram_verified?: boolean | null
          is_active?: boolean
          is_pro?: boolean | null
          name: string
          plan?: string | null
          plan_renewal_date?: string | null
          responsible_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          selected_plan?: string | null
          skip_subscription_check?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          accepted_terms_at?: string | null
          account_type?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          agency_id?: string | null
          agency_name?: string | null
          billing_cycle?: string | null
          blocked_by_parent?: boolean
          client_id?: string | null
          created_at?: string
          current_period_end?: string | null
          delinquent?: boolean | null
          document?: string | null
          grace_period_end?: string | null
          id?: string
          instagram_handle?: string | null
          instagram_verified?: boolean | null
          is_active?: boolean
          is_pro?: boolean | null
          name?: string
          plan?: string | null
          plan_renewal_date?: string | null
          responsible_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          selected_plan?: string | null
          skip_subscription_check?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_taxes: {
        Row: {
          applies_to: string
          category: string | null
          created_at: string | null
          id: string
          is_fixed: boolean
          notes: string | null
          tax_name: string
          tax_rate: number
          updated_at: string | null
        }
        Insert: {
          applies_to?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_fixed?: boolean
          notes?: string | null
          tax_name: string
          tax_rate?: number
          updated_at?: string | null
        }
        Update: {
          applies_to?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_fixed?: boolean
          notes?: string | null
          tax_name?: string
          tax_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      security_alerts_sent: {
        Row: {
          alert_date: string
          alert_type: string
          details: Json | null
          id: string
          ip_address: string
          notified_at: string
        }
        Insert: {
          alert_date?: string
          alert_type: string
          details?: Json | null
          id?: string
          ip_address: string
          notified_at?: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          details?: Json | null
          id?: string
          ip_address?: string
          notified_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      test_runs: {
        Row: {
          created_at: string | null
          executed_by: string | null
          id: string
          results: Json | null
          status: string
          test_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          executed_by?: string | null
          id?: string
          results?: Json | null
          status: string
          test_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          executed_by?: string | null
          id?: string
          results?: Json | null
          status?: string
          test_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      token_validation_attempts: {
        Row: {
          attempted_at: string
          blocked_until: string | null
          id: string
          ip_address: string
          success: boolean
          token_attempted: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          blocked_until?: string | null
          id?: string
          ip_address: string
          success?: boolean
          token_attempted?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          blocked_until?: string | null
          id?: string
          ip_address?: string
          success?: boolean
          token_attempted?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          created_at: string | null
          google_ads_conversion_id: string | null
          google_ads_conversion_label: string | null
          google_analytics_id: string | null
          google_oauth_refresh_token_encrypted: string | null
          google_tag_manager_id: string | null
          id: string
          is_active: boolean | null
          linkedin_partner_id: string | null
          meta_access_token_encrypted: string | null
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          pinterest_access_token_encrypted: string | null
          pinterest_tag_id: string | null
          tiktok_access_token_encrypted: string | null
          tiktok_pixel_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          google_analytics_id?: string | null
          google_oauth_refresh_token_encrypted?: string | null
          google_tag_manager_id?: string | null
          id?: string
          is_active?: boolean | null
          linkedin_partner_id?: string | null
          meta_access_token_encrypted?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          pinterest_access_token_encrypted?: string | null
          pinterest_tag_id?: string | null
          tiktok_access_token_encrypted?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          google_analytics_id?: string | null
          google_oauth_refresh_token_encrypted?: string | null
          google_tag_manager_id?: string | null
          id?: string
          is_active?: boolean | null
          linkedin_partner_id?: string | null
          meta_access_token_encrypted?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          pinterest_access_token_encrypted?: string | null
          pinterest_tag_id?: string | null
          tiktok_access_token_encrypted?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trusted_ips: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          approver_id: string
          client_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          identifier: string
          identifier_type: string
          ip_address: string | null
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          approver_id: string
          client_id: string
          code: string
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          identifier_type: string
          ip_address?: string | null
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          approver_id?: string
          client_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          ip_address?: string | null
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_codes_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "client_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          notify_email: boolean | null
          notify_webhook: boolean | null
          notify_whatsapp: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_email?: boolean | null
          notify_webhook?: boolean | null
          notify_whatsapp?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_email?: boolean | null
          notify_webhook?: boolean | null
          notify_whatsapp?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          client_id: string
          created_at: string
          delivered_at: string | null
          event: string
          id: string
          payload: Json
          status: Database["public"]["Enums"]["webhook_status"]
        }
        Insert: {
          client_id: string
          created_at?: string
          delivered_at?: string | null
          event: string
          id?: string
          payload: Json
          status?: Database["public"]["Enums"]["webhook_status"]
        }
        Update: {
          client_id?: string
          created_at?: string
          delivered_at?: string | null
          event?: string
          id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["webhook_status"]
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agencies_public: {
        Row: {
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      agencies_secure: {
        Row: {
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string | null
          email: string | null
          id: string | null
          last_payment_date: string | null
          logo_url: string | null
          name: string | null
          plan: string | null
          plan_renewal_date: string | null
          plan_type: string | null
          slug: string | null
          updated_at: string | null
          webhook_url: string | null
          whatsapp: string | null
        }
        Insert: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          last_payment_date?: string | null
          logo_url?: string | null
          name?: string | null
          plan?: string | null
          plan_renewal_date?: string | null
          plan_type?: string | null
          slug?: string | null
          updated_at?: string | null
          webhook_url?: never
          whatsapp?: never
        }
        Update: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          last_payment_date?: string | null
          logo_url?: string | null
          name?: string | null
          plan?: string | null
          plan_renewal_date?: string | null
          plan_type?: string | null
          slug?: string | null
          updated_at?: string | null
          webhook_url?: never
          whatsapp?: never
        }
        Relationships: []
      }
      client_social_accounts_decrypted: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          client_id: string | null
          created_at: string | null
          id: string | null
          instagram_business_account_id: string | null
          is_active: boolean | null
          page_id: string | null
          platform: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: never
          account_id?: string | null
          account_name?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          instagram_business_account_id?: string | null
          is_active?: boolean | null
          page_id?: string | null
          platform?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: never
          account_id?: string | null
          account_name?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          instagram_business_account_id?: string | null
          is_active?: boolean | null
          page_id?: string | null
          platform?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      clients_public: {
        Row: {
          created_at: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      clients_secure: {
        Row: {
          address: string | null
          agency_id: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          monthly_creatives: number | null
          name: string | null
          notify_email: boolean | null
          notify_webhook: boolean | null
          notify_whatsapp: boolean | null
          plan_renewal_date: string | null
          responsible_user_id: string | null
          slug: string | null
          timezone: string | null
          updated_at: string | null
          webhook_url: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          logo_url?: string | null
          monthly_creatives?: number | null
          name?: string | null
          notify_email?: boolean | null
          notify_webhook?: boolean | null
          notify_whatsapp?: boolean | null
          plan_renewal_date?: string | null
          responsible_user_id?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string | null
          webhook_url?: never
          website?: string | null
          whatsapp?: never
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          logo_url?: string | null
          monthly_creatives?: number | null
          name?: string | null
          notify_email?: boolean | null
          notify_webhook?: boolean | null
          notify_whatsapp?: boolean | null
          plan_renewal_date?: string | null
          responsible_user_id?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string | null
          webhook_url?: never
          website?: string | null
          whatsapp?: never
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_responsible_user"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      current_subscription_distribution: {
        Row: {
          active_count: number | null
          plan: string | null
          subscription_status: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_client_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_2fa_data: { Args: never; Returns: undefined }
      cleanup_old_validation_attempts: { Args: never; Returns: undefined }
      decrypt_social_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      encrypt_social_token: { Args: { token: string }; Returns: string }
      find_approver_by_identifier: {
        Args: { p_identifier: string }
        Returns: Record<string, unknown>
      }
      fix_orphaned_user: {
        Args: {
          p_agency_email: string
          p_agency_name: string
          p_agency_whatsapp: string
          p_plan: string
          p_plan_type: string
          p_user_id: string
        }
        Returns: Json
      }
      get_agency_admin_email: {
        Args: { agency_id_param: string }
        Returns: string
      }
      get_blocked_ips: {
        Args: never
        Returns: {
          blocked_until: string
          failed_attempts: number
          ip_address: string
          last_attempt: string
          user_agents: string[]
        }[]
      }
      get_database_size_mb: { Args: never; Returns: number }
      get_monthly_bandwidth_gb: { Args: never; Returns: number }
      get_storage_size_gb: { Args: never; Returns: number }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      get_user_entitlements: {
        Args: { user_id: string }
        Returns: {
          creatives_limit: number
          global_agenda: boolean
          graphics_approval: boolean
          history_days: number
          plan: string
          posts_limit: number
          supplier_link: boolean
          team_kanban: boolean
          team_members_limit: number
          team_notifications: boolean
          whatsapp_support: boolean
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ip_blocked: {
        Args: { p_ip_address: string }
        Returns: {
          blocked_until: string
          failed_attempts: number
          is_blocked: boolean
          is_permanent: boolean
        }[]
      }
      is_subscription_active: { Args: { user_id: string }; Returns: boolean }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
      log_validation_attempt: {
        Args: {
          p_ip_address: string
          p_success: boolean
          p_token_attempted: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      normalize_whatsapp: { Args: { phone: string }; Returns: string }
      sanitize_webhook_payload: { Args: { payload: Json }; Returns: Json }
      send_notification: {
        Args: {
          p_agency_id?: string
          p_client_id?: string
          p_content_id?: string
          p_event: string
          p_payload?: Json
          p_user_id?: string
        }
        Returns: string
      }
      unblock_ip: {
        Args: { p_ip_address: string; p_unblocked_by: string }
        Returns: Json
      }
      user_belongs_to_agency: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "agency_admin"
        | "client_user"
        | "team_member"
        | "approver"
      content_status:
        | "draft"
        | "in_review"
        | "changes_requested"
        | "approved"
        | "archived"
      content_type: "image" | "carousel" | "reels" | "story" | "feed"
      legal_basis: "contract" | "legitimate_interest"
      media_kind: "image" | "video"
      ticket_category: "atendimento" | "suporte" | "duvidas" | "financeiro"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_user"
        | "waiting_support"
        | "resolved"
        | "closed"
      user_role: "super_admin" | "agency_admin" | "client_user"
      webhook_status: "queued" | "sent" | "error"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: [
        "super_admin",
        "agency_admin",
        "client_user",
        "team_member",
        "approver",
      ],
      content_status: [
        "draft",
        "in_review",
        "changes_requested",
        "approved",
        "archived",
      ],
      content_type: ["image", "carousel", "reels", "story", "feed"],
      legal_basis: ["contract", "legitimate_interest"],
      media_kind: ["image", "video"],
      ticket_category: ["atendimento", "suporte", "duvidas", "financeiro"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_user",
        "waiting_support",
        "resolved",
        "closed",
      ],
      user_role: ["super_admin", "agency_admin", "client_user"],
      webhook_status: ["queued", "sent", "error"],
    },
  },
} as const
