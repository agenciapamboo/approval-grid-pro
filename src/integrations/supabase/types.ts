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
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
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
        ]
      }
      agencies: {
        Row: {
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string
          email: string | null
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
          whatsapp: string | null
        }
        Insert: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          email?: string | null
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
          whatsapp?: string | null
        }
        Update: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string
          email?: string | null
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
          whatsapp?: string | null
        }
        Relationships: []
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
        ]
      }
      clients: {
        Row: {
          address: string | null
          agency_id: string
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          monthly_creatives: number | null
          name: string
          plan_renewal_date: string | null
          responsible_user_id: string | null
          slug: string
          timezone: string | null
          updated_at: string
          webhook_url: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          monthly_creatives?: number | null
          name: string
          plan_renewal_date?: string | null
          responsible_user_id?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string
          webhook_url?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          monthly_creatives?: number | null
          name?: string
          plan_renewal_date?: string | null
          responsible_user_id?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string
          webhook_url?: string | null
          website?: string | null
          whatsapp?: string | null
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
          author_user_id: string
          body: string
          content_id: string
          created_at: string
          id: string
          is_adjustment_request: boolean | null
          version: number
        }
        Insert: {
          adjustment_reason?: string | null
          author_user_id: string
          body: string
          content_id: string
          created_at?: string
          id?: string
          is_adjustment_request?: boolean | null
          version: number
        }
        Update: {
          adjustment_reason?: string | null
          author_user_id?: string
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          is_adjustment_request?: boolean | null
          version?: number
        }
        Relationships: [
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
      content_texts: {
        Row: {
          caption: string | null
          content_id: string
          created_at: string
          id: string
          version: number
        }
        Insert: {
          caption?: string | null
          content_id: string
          created_at?: string
          id?: string
          version: number
        }
        Update: {
          caption?: string | null
          content_id?: string
          created_at?: string
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
        ]
      }
      contents: {
        Row: {
          category: string | null
          channels: string[] | null
          client_id: string
          created_at: string
          date: string
          deadline: string | null
          id: string
          owner_user_id: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          channels?: string[] | null
          client_id: string
          created_at?: string
          date: string
          deadline?: string | null
          id?: string
          owner_user_id: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          channels?: string[] | null
          client_id?: string
          created_at?: string
          date?: string
          deadline?: string | null
          id?: string
          owner_user_id?: string
          status?: Database["public"]["Enums"]["content_status"]
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
            foreignKeyName: "contents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      profiles: {
        Row: {
          accepted_terms_at: string | null
          agency_id: string | null
          client_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          plan: string | null
          plan_renewal_date: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          agency_id?: string | null
          client_id?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          plan?: string | null
          plan_renewal_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          agency_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          plan?: string | null
          plan_renewal_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
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
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agency_admin_email: {
        Args: { agency_id_param: string }
        Returns: string
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
      sanitize_webhook_payload: {
        Args: { payload: Json }
        Returns: Json
      }
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
    }
    Enums: {
      app_role: "super_admin" | "agency_admin" | "client_user"
      content_status: "draft" | "in_review" | "changes_requested" | "approved"
      content_type: "image" | "carousel" | "reels" | "story" | "feed"
      legal_basis: "contract" | "legitimate_interest"
      media_kind: "image" | "video"
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
      app_role: ["super_admin", "agency_admin", "client_user"],
      content_status: ["draft", "in_review", "changes_requested", "approved"],
      content_type: ["image", "carousel", "reels", "story", "feed"],
      legal_basis: ["contract", "legitimate_interest"],
      media_kind: ["image", "video"],
      user_role: ["super_admin", "agency_admin", "client_user"],
      webhook_status: ["queued", "sent", "error"],
    },
  },
} as const
