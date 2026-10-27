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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      memocious_catalogue_products: {
        Row: {
          avg_rating: number | null
          created_at: string
          data: Json
          featured: boolean
          id: string
          price_paise: number | null
          review_count: number
          search_vector: unknown
          slug: string
        }
        Insert: {
          avg_rating?: number | null
          created_at: string
          data: Json
          featured: boolean
          id: string
          price_paise?: number | null
          review_count?: number
          search_vector: unknown
          slug: string
        }
        Update: {
          avg_rating?: number | null
          created_at?: string
          data?: Json
          featured?: boolean
          id?: string
          price_paise?: number | null
          review_count?: number
          search_vector?: unknown
          slug?: string
        }
        Relationships: []
      }
      memocious_public_config: {
        Row: {
          brand: string
          contact_email: string
          require_login: boolean
          singleton: boolean
          tagline: string
          whatsapp_number: string | null
        }
        Insert: {
          brand?: string
          contact_email?: string
          require_login?: boolean
          singleton?: boolean
          tagline?: string
          whatsapp_number?: string | null
        }
        Update: {
          brand?: string
          contact_email?: string
          require_login?: boolean
          singleton?: boolean
          tagline?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      memocious_taxonomy_items: {
        Row: {
          icon: string
          id: string
          kind: string
          label: string
          parent_slug: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          icon: string
          id: string
          kind: string
          label: string
          parent_slug?: string | null
          slug: string
          sort_order: number
        }
        Update: {
          icon?: string
          id?: string
          kind?: string
          label?: string
          parent_slug?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      memocious_addresses: {
        Args: { sid: string; action?: string; address_id?: string; expected_version?: number; fields?: Json }
        Returns: Json
      }
      memocious_admin_assert: {
        Args: { sid: string; owner_only?: boolean; recent?: boolean }
        Returns: string
      }
      memocious_admin_delete: {
        Args: { sid: string; scope_ids: string[]; mode: string; expected_digest?: string; confirmation?: string }
        Returns: Json
      }
      memocious_admin_inquiries: {
        Args: { sid: string; entity?: string; expected_version?: number; action?: string; fields?: Json; page_num?: number }
        Returns: Json
      }
      memocious_admin_list: {
        Args: { sid: string; page_num?: number }
        Returns: Json
      }
      memocious_admin_number: {
        Args: { sid: string; number_digits: string }
        Returns: undefined
      }
      memocious_admin_product: {
        Args: { sid: string; product_id: string; expected_version: number; action: string; fields?: Json }
        Returns: Json
      }
      memocious_admin_proof: {
        Args: { sid: string; action?: string; entity?: string; expected_version?: number; fields?: Json; page_num?: number }
        Returns: Json
      }
      memocious_admin_reviews: {
        Args: { sid: string; review_id?: string; expected_version?: number; action?: string; note?: string; report_id?: string; page_num?: number }
        Returns: Json
      }
      memocious_admin_settings: {
        Args: { sid: string; fields: Json }
        Returns: undefined
      }
      memocious_admin_taxonomy: {
        Args: { sid: string; kind: string; item_id: string; expected_version: number; fields: Json }
        Returns: undefined
      }
      memocious_admin_workspace: {
        Args: { sid: string; page_num?: number }
        Returns: Json
      }
      memocious_asset: {
        Args: { sid: string; asset: string; action: string; details?: Json }
        Returns: Json
      }
      memocious_asset_begin: {
        Args: { sid: string; kind: string; parent: string; bytes: number; mime: string; consent: boolean }
        Returns: string
      }
      memocious_builder_choices: {
        Args: { gift_type: string; selected_product?: string }
        Returns: Json
      }
      memocious_builder_cleanup: {
        Args: never
        Returns: Json
      }
      memocious_builder_draft: {
        Args: { sid: string; action?: string; draft_id?: string; expected_version?: number; draft_schema?: number; step_num?: number; fields?: Json }
        Returns: Json
      }
      memocious_builder_draft_v1: {
        Args: { sid: string; action?: string; draft_id?: string; expected_version?: number; draft_schema?: number; step_num?: number; fields?: Json }
        Returns: Json
      }
      memocious_builder_file: {
        Args: { sid: string; file_id: string; action: string; details?: Json }
        Returns: Json
      }
      memocious_builder_file_begin: {
        Args: { sid: string; draft: string; expected_version: number; bytes: number; declared_mime: string }
        Returns: string
      }
      memocious_builder_file_cleanup: {
        Args: { file_id?: string; finished?: boolean; quarantine_only?: boolean }
        Returns: Json
      }
      memocious_catalogue: {
        Args: { filters?: Json }
        Returns: Json
      }
      memocious_catalogue_document: {
        Args: { sid: string; document: string }
        Returns: Json
      }
      memocious_catalogue_preview: {
        Args: { sid: string; document: string }
        Returns: undefined
      }
      memocious_csrf_rotate: {
        Args: { cookie_hash: string; new_csrf_hash: string }
        Returns: undefined
      }
      memocious_enquiry: {
        Args: { sid: string; request_key: string; product: string; qty: number; selected: string[]; personal_message: string; budget_paise: number; occasion: string; pincode: string }
        Returns: Json
      }
      memocious_enquiry_replay: {
        Args: { sid: string; request_key: string; product: string; qty: number; selected: string[]; personal_message: string; budget_paise: number; occasion: string; pincode: string }
        Returns: Json
      }
      memocious_enterprise_choices: {
        Args: never
        Returns: Json
      }
      memocious_inquiry: {
        Args: { sid: string; request_key: string; kind: string; fields: Json }
        Returns: Json
      }
      memocious_media_begin: {
        Args: { sid: string; product: string; bytes: number; alt_text: string }
        Returns: string
      }
      memocious_media_claim: {
        Args: { sid: string; job_id: string }
        Returns: Json
      }
      memocious_media_cleanup: {
        Args: { job_id?: string; quarantine_only?: boolean }
        Returns: Json
      }
      memocious_media_public: {
        Args: { image: string }
        Returns: string
      }
      memocious_media_read: {
        Args: { sid: string; image: string }
        Returns: Json
      }
      memocious_media_ready: {
        Args: { sid: string; job_id: string; pixel_width: number; pixel_height: number; output_size: number; digest: string; failed?: boolean }
        Returns: string
      }
      memocious_media_update: {
        Args: { sid: string; image: string; product_version: number; operation: string; alt_text: string; sort_position: number }
        Returns: undefined
      }
      memocious_my_enterprise: {
        Args: { sid: string }
        Returns: Json
      }
      memocious_my_review: {
        Args: { sid: string; product: string }
        Returns: Json
      }
      memocious_my_reviews: {
        Args: { sid: string }
        Returns: Json
      }
      memocious_operator_bootstrap: {
        Args: { provider_user: string; approved_email_hash: string }
        Returns: undefined
      }
      memocious_phase2_cleanup: {
        Args: { asset?: string; finished?: boolean }
        Returns: Json
      }
      memocious_phase2_public: {
        Args: never
        Returns: Json
      }
      memocious_privacy: {
        Args: { sid: string; action: string }
        Returns: Json
      }
      memocious_product: {
        Args: { product_slug: string }
        Returns: Json
      }
      memocious_profile: {
        Args: { sid: string; new_name?: string }
        Returns: Json
      }
      memocious_public_settings: {
        Args: never
        Returns: Json
      }
      memocious_rate_limit: {
        Args: { operation_name: string; ip_hash: string; actor_hash: string }
        Returns: Json
      }
      memocious_refresh_claim: {
        Args: { sid: string; lease: string }
        Returns: boolean
      }
      memocious_refresh_commit: {
        Args: { sid: string; lease: string; tokens: string }
        Returns: undefined
      }
      memocious_review: {
        Args: { sid: string; product: string; expected_version: number; action: string; stars?: number; review_text?: string; first_name?: string }
        Returns: Json
      }
      memocious_review_report: {
        Args: { sid: string; review_key: string; report_reason: string }
        Returns: undefined
      }
      memocious_reviews: {
        Args: { product_slug?: string; page_num?: number }
        Returns: Json
      }
      memocious_session_mfa: {
        Args: { sid: string; new_cookie_hash: string; new_csrf_hash: string; new_encrypted_tokens: string }
        Returns: undefined
      }
      memocious_session_open: {
        Args: { cookie_hash: string; csrf_hash: string; provider_user: string; audience: string; encrypted_tokens: string; key_version: string }
        Returns: string
      }
      memocious_session_read: {
        Args: { cookie_hash: string; intentional?: boolean }
        Returns: Json
      }
      memocious_session_revoke: {
        Args: { sid: string; everywhere?: boolean }
        Returns: undefined
      }
      memocious_taxonomy: {
        Args: never
        Returns: Json
      }
      memocious_wishlist: {
        Args: { sid: string; product?: string; saved?: boolean }
        Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
