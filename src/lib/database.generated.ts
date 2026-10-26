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
      memocious_admin_assert: {
        Args: { owner_only?: boolean; recent?: boolean; sid: string }
        Returns: string
      }
      memocious_admin_delete: {
        Args: {
          confirmation?: string
          expected_digest?: string
          mode: string
          scope_ids: string[]
          sid: string
        }
        Returns: Json
      }
      memocious_admin_list: {
        Args: { page_num?: number; sid: string }
        Returns: Json
      }
      memocious_admin_number: {
        Args: { number_digits: string; sid: string }
        Returns: undefined
      }
      memocious_admin_product: {
        Args: {
          action: string
          expected_version: number
          fields?: Json
          product_id: string
          sid: string
        }
        Returns: Json
      }
      memocious_admin_settings: {
        Args: { fields: Json; sid: string }
        Returns: undefined
      }
      memocious_admin_taxonomy: {
        Args: {
          expected_version: number
          fields: Json
          item_id: string
          kind: string
          sid: string
        }
        Returns: undefined
      }
      memocious_admin_workspace: {
        Args: { page_num?: number; sid: string }
        Returns: Json
      }
      memocious_catalogue: { Args: { filters?: Json }; Returns: Json }
      memocious_csrf_rotate: {
        Args: { cookie_hash: string; new_csrf_hash: string }
        Returns: undefined
      }
      memocious_enquiry: {
        Args: {
          budget_paise: number
          occasion: string
          personal_message: string
          pincode: string
          product: string
          qty: number
          request_key: string
          selected: string[]
          sid: string
        }
        Returns: Json
      }
      memocious_enquiry_replay: {
        Args: {
          budget_paise: number
          occasion: string
          personal_message: string
          pincode: string
          product: string
          qty: number
          request_key: string
          selected: string[]
          sid: string
        }
        Returns: Json
      }
      memocious_media_begin: {
        Args: { alt_text: string; bytes: number; product: string; sid: string }
        Returns: string
      }
      memocious_media_claim: {
        Args: { job_id: string; sid: string }
        Returns: Json
      }
      memocious_media_cleanup: {
        Args: { job_id?: string; quarantine_only?: boolean }
        Returns: Json
      }
      memocious_media_public: { Args: { image: string }; Returns: string }
      memocious_media_read: {
        Args: { image: string; sid: string }
        Returns: Json
      }
      memocious_media_ready: {
        Args: {
          digest: string
          failed?: boolean
          job_id: string
          output_size: number
          pixel_height: number
          pixel_width: number
          sid: string
        }
        Returns: string
      }
      memocious_media_update: {
        Args: {
          alt_text: string
          image: string
          operation: string
          product_version: number
          sid: string
          sort_position: number
        }
        Returns: undefined
      }
      memocious_operator_bootstrap: {
        Args: { approved_email_hash: string; provider_user: string }
        Returns: undefined
      }
      memocious_product: { Args: { product_slug: string }; Returns: Json }
      memocious_wishlist: {
        Args: { sid: string; product?: string; saved?: boolean }
        Returns: Json
      }
      memocious_profile: {
        Args: { new_name?: string; sid: string }
        Returns: Json
      }
      memocious_public_settings: { Args: never; Returns: Json }
      memocious_rate_limit: {
        Args: { actor_hash: string; ip_hash: string; operation_name: string }
        Returns: Json
      }
      memocious_refresh_claim: {
        Args: { lease: string; sid: string }
        Returns: boolean
      }
      memocious_refresh_commit: {
        Args: { lease: string; sid: string; tokens: string }
        Returns: undefined
      }
      memocious_session_mfa: {
        Args: {
          new_cookie_hash: string
          new_csrf_hash: string
          new_encrypted_tokens: string
          sid: string
        }
        Returns: undefined
      }
      memocious_session_open: {
        Args: {
          audience: string
          cookie_hash: string
          csrf_hash: string
          encrypted_tokens: string
          key_version: string
          provider_user: string
        }
        Returns: string
      }
      memocious_session_read: {
        Args: { cookie_hash: string; intentional?: boolean }
        Returns: Json
      }
      memocious_session_revoke: {
        Args: { everywhere?: boolean; sid: string }
        Returns: undefined
      }
      memocious_taxonomy: { Args: never; Returns: Json }
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
