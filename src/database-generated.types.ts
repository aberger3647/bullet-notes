// GENERATED — do not edit by hand.
// Re-run `npm run gen:types` after schema migrations.

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
      alerts: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          last_dayof_notified: string | null
          last_forecast_checked: string | null
          last_notified: string | null
          location_id: number
          unsubscribe_token: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          last_dayof_notified?: string | null
          last_forecast_checked?: string | null
          last_notified?: string | null
          location_id: number
          unsubscribe_token?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          last_dayof_notified?: string | null
          last_forecast_checked?: string | null
          last_notified?: string | null
          location_id?: number
          unsubscribe_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_location_id_fkey"
            columns: ["location_id"]
            referencedRelation: "user_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bullet_notes_docs: {
        Row: {
          created_at: string
          id: string
          settings: Json
          title: string
          tree: Json
          updated_at: string
          user_id: string
          zoom_path: Json
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          title?: string
          tree?: Json
          updated_at?: string
          user_id: string
          zoom_path?: Json
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          title?: string
          tree?: Json
          updated_at?: string
          user_id?: string
          zoom_path?: Json
        }
        Relationships: []
      }
      bullet_notes_document_recipients: {
        Row: {
          document_id: string
          first_opened_at: string
          last_opened_at: string
          recipient_id: string
        }
        Insert: {
          document_id: string
          first_opened_at?: string
          last_opened_at?: string
          recipient_id: string
        }
        Update: {
          document_id?: string
          first_opened_at?: string
          last_opened_at?: string
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bullet_notes_document_recipients_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "bullet_notes_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bullet_notes_documents: {
        Row: {
          id: string
          last_edited_by: string | null
          permission: string
          revoked: boolean
          share_token: string
          tree: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          last_edited_by?: string | null
          permission?: string
          revoked?: boolean
          share_token?: string
          tree: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          last_edited_by?: string | null
          permission?: string
          revoked?: boolean
          share_token?: string
          tree?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bullet_notes_schema_migrations: {
        Row: {
          applied_at: string
          id: string
        }
        Insert: {
          applied_at?: string
          id: string
        }
        Update: {
          applied_at?: string
          id?: string
        }
        Relationships: []
      }
      bullet_notes_user_document_snapshots: {
        Row: {
          created_at: string
          id: string
          settings: Json
          tree: Json
          user_id: string
          zoom_path: Json
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          tree: Json
          user_id: string
          zoom_path?: Json
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          tree?: Json
          user_id?: string
          zoom_path?: Json
        }
        Relationships: []
      }
      bullet_notes_user_documents: {
        Row: {
          settings: Json
          tree: Json
          updated_at: string
          user_id: string
          zoom_path: Json
        }
        Insert: {
          settings?: Json
          tree?: Json
          updated_at?: string
          user_id: string
          zoom_path?: Json
        }
        Update: {
          settings?: Json
          tree?: Json
          updated_at?: string
          user_id?: string
          zoom_path?: Json
        }
        Relationships: []
      }
      dark_sky_places: {
        Row: {
          category: string | null
          coords: string | null
          created_at: string | null
          id: number
          lat: number
          lng: number
          location: string | null
          place_name: string
        }
        Insert: {
          category?: string | null
          coords?: string | null
          created_at?: string | null
          id?: number
          lat: number
          lng: number
          location?: string | null
          place_name: string
        }
        Update: {
          category?: string | null
          coords?: string | null
          created_at?: string | null
          id?: number
          lat?: number
          lng?: number
          location?: string | null
          place_name?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          created_at: string
          difficulty: number | null
          due: string | null
          elapsed_days: number
          id: number
          img_url: string
          lapses: number | null
          last_review: string | null
          learning_steps: number | null
          reps: number | null
          scheduled_days: number | null
          stability: number | null
          state: number
          word: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          id?: number
          img_url?: string
          lapses?: number | null
          last_review?: string | null
          learning_steps?: number | null
          reps?: number | null
          scheduled_days?: number | null
          stability?: number | null
          state?: number
          word?: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          id?: number
          img_url?: string
          lapses?: number | null
          last_review?: string | null
          learning_steps?: number | null
          reps?: number | null
          scheduled_days?: number | null
          stability?: number | null
          state?: number
          word?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          first_name: string
          goals: string | null
          id: string
          interests: string | null
          last_name: string
          message: string | null
          phone: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          goals?: string | null
          id?: string
          interests?: string | null
          last_name: string
          message?: string | null
          phone?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          goals?: string | null
          id?: string
          interests?: string | null
          last_name?: string
          message?: string | null
          phone?: string | null
          source?: string
        }
        Relationships: []
      }
      review_logs: {
        Row: {
          created_at: string
          difficulty: number | null
          due: string | null
          elapsed_days: number
          flashcard_id: number
          id: number
          last_elapsed_days: number
          rating: number
          review: string
          scheduled_days: number
          stability: number | null
          state: number
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days: number
          flashcard_id: number
          id?: number
          last_elapsed_days: number
          rating: number
          review: string
          scheduled_days: number
          stability?: number | null
          state: number
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number
          flashcard_id?: number
          id?: number
          last_elapsed_days?: number
          rating?: number
          review?: string
          scheduled_days?: number
          stability?: number | null
          state?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_logs_flashcard_id_fkey"
            columns: ["flashcard_id"]
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          created_at: string | null
          id: number
          lat: number
          lng: number
          location_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          lat: number
          lng: number
          location_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          lat?: number
          lng?: number
          location_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bullet_notes_create_doc: {
        Args: {
          p_settings: Json
          p_title: string
          p_tree: Json
          p_zoom_path: Json
        }
        Returns: string
      }
      bullet_notes_create_document: { Args: { p_tree: Json }; Returns: string }
      bullet_notes_delete_doc: { Args: { p_id: string }; Returns: undefined }
      bullet_notes_delete_my_data: { Args: never; Returns: undefined }
      bullet_notes_get_doc: { Args: { p_id: string }; Returns: Json }
      bullet_notes_get_document: {
        Args: { p_share_token: string }
        Returns: Json
      }
      bullet_notes_get_document_meta: {
        Args: { p_share_token: string }
        Returns: Json
      }
      bullet_notes_get_user_document: { Args: never; Returns: Json }
      bullet_notes_list_docs: { Args: never; Returns: Json }
      bullet_notes_list_my_shares: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      bullet_notes_list_share_recipients: {
        Args: { p_share_token: string }
        Returns: Json
      }
      bullet_notes_list_shared_with_me: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      bullet_notes_list_snapshots: { Args: never; Returns: Json }
      bullet_notes_record_share_open: {
        Args: { p_share_token: string }
        Returns: undefined
      }
      bullet_notes_restore_snapshot: { Args: { p_id: string }; Returns: Json }
      bullet_notes_revoke_share: {
        Args: { p_share_token: string }
        Returns: undefined
      }
      bullet_notes_save_doc: {
        Args: {
          p_id: string
          p_settings: Json
          p_title: string
          p_tree: Json
          p_zoom_path: Json
        }
        Returns: undefined
      }
      bullet_notes_save_document: {
        Args: { p_share_token: string; p_tree: Json }
        Returns: undefined
      }
      bullet_notes_save_user_document: {
        Args: { p_settings: Json; p_tree: Json; p_zoom_path: Json }
        Returns: undefined
      }
      bullet_notes_set_share_permission: {
        Args: { p_permission: string; p_share_token: string }
        Returns: undefined
      }
      bullet_notes_snapshot_user_document: { Args: never; Returns: undefined }
      get_places: {
        Args: {
          p_lat: number
          p_limit_rows: number
          p_lng: number
          p_radius: number
        }
        Returns: {
          category: string
          distance: number
          id: number
          lat: number
          lng: number
          place_name: string
        }[]
      }
      workout_instantiate_template: {
        Args: {
          p_anchor_dow: number[]
          p_client_id: string
          p_replace_dates?: boolean
          p_resolve_exercises?: Json
          p_resolve_lifts?: Json
          p_start_date: string
          p_template_id: string
        }
        Returns: string
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
    Enums: {},
  },
} as const
