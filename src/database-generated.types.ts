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
      bullet_notes_documents: {
        Row: {
          id: string
          permission: string
          revoked: boolean
          share_token: string
          tree: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          permission?: string
          revoked?: boolean
          share_token?: string
          tree: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
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
      client_invitations: {
        Row: {
          coach_id: string
          created_at: string
          display_name: string
          email: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          display_name: string
          email: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          display_name?: string
          email?: string
        }
        Relationships: []
      }
      client_rep_max_history: {
        Row: {
          bench_1rm_kg: number | null
          changed_at: string
          client_id: string
          coach_id: string
          deadlift_1rm_kg: number | null
          id: string
          squat_1rm_kg: number | null
        }
        Insert: {
          bench_1rm_kg?: number | null
          changed_at?: string
          client_id: string
          coach_id: string
          deadlift_1rm_kg?: number | null
          id?: string
          squat_1rm_kg?: number | null
        }
        Update: {
          bench_1rm_kg?: number | null
          changed_at?: string
          client_id?: string
          coach_id?: string
          deadlift_1rm_kg?: number | null
          id?: string
          squat_1rm_kg?: number | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          auth_user_id: string
          bench_1rm_kg: number | null
          coach_id: string
          created_at: string
          deadlift_1rm_kg: number | null
          display_name: string
          email: string | null
          squat_1rm_kg: number | null
        }
        Insert: {
          auth_user_id: string
          bench_1rm_kg?: number | null
          coach_id: string
          created_at?: string
          deadlift_1rm_kg?: number | null
          display_name: string
          email?: string | null
          squat_1rm_kg?: number | null
        }
        Update: {
          auth_user_id?: string
          bench_1rm_kg?: number | null
          coach_id?: string
          created_at?: string
          deadlift_1rm_kg?: number | null
          display_name?: string
          email?: string | null
          squat_1rm_kg?: number | null
        }
        Relationships: []
      }
      coach_exercises: {
        Row: {
          body_parts: string[]
          coach_id: string
          default_duration_seconds: number | null
          default_duration_unit: string | null
          measure: string
          movement_pattern: string | null
          name: string
          name_lower: string
          notes: string | null
          section: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body_parts?: string[]
          coach_id: string
          default_duration_seconds?: number | null
          default_duration_unit?: string | null
          measure?: string
          movement_pattern?: string | null
          name: string
          name_lower?: string
          notes?: string | null
          section?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body_parts?: string[]
          coach_id?: string
          default_duration_seconds?: number | null
          default_duration_unit?: string | null
          measure?: string
          movement_pattern?: string | null
          name?: string
          name_lower?: string
          notes?: string | null
          section?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      coaches: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
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
      user_preferences: {
        Row: {
          display_unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          display_unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          display_unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      workouts: {
        Row: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        Insert: {
          actual_results?: Json | null
          client_exercise_notes?: Json | null
          client_id: string
          client_note?: string | null
          client_videos?: Json | null
          completed_at?: string | null
          completed_exercises?: Json | null
          created_at?: string
          cycle_id?: string | null
          cycle_lift?: string | null
          cycle_week?: number | null
          duration_seconds?: number | null
          exercises?: Json
          id?: string
          notes?: string | null
          scheduled_date: string
          started_at?: string | null
          title: string
        }
        Update: {
          actual_results?: Json | null
          client_exercise_notes?: Json | null
          client_id?: string
          client_note?: string | null
          client_videos?: Json | null
          completed_at?: string | null
          completed_exercises?: Json | null
          created_at?: string
          cycle_id?: string | null
          cycle_lift?: string | null
          cycle_week?: number | null
          duration_seconds?: number | null
          exercises?: Json
          id?: string
          notes?: string | null
          scheduled_date?: string
          started_at?: string | null
          title?: string
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
      bullet_notes_get_user_document: { Args: never; Returns: Json }
      bullet_notes_list_docs: { Args: never; Returns: Json }
      bullet_notes_list_my_shares: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      bullet_notes_list_snapshots: { Args: never; Returns: Json }
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
      caller_can_access_workout_video: {
        Args: { p_name: string }
        Returns: boolean
      }
      client_move_workout: {
        Args: { p_new_date: string; p_workout_id: string }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      coach_add_client: {
        Args: { p_display_name: string; p_email: string }
        Returns: {
          auth_user_id: string
          bench_1rm_kg: number | null
          coach_id: string
          created_at: string
          deadlift_1rm_kg: number | null
          display_name: string
          email: string | null
          squat_1rm_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      coach_generate_531_cycle: {
        Args: { p_client_id: string; p_start_monday: string; p_workouts: Json }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      coach_get_client_rep_max_history: {
        Args: { p_client_id: string }
        Returns: {
          bench_1rm_kg: number | null
          changed_at: string
          client_id: string
          coach_id: string
          deadlift_1rm_kg: number | null
          id: string
          squat_1rm_kg: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "client_rep_max_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      coach_invite_client: {
        Args: { p_display_name: string; p_email: string }
        Returns: {
          coach_id: string
          created_at: string
          display_name: string
          email: string
        }
        SetofOptions: {
          from: "*"
          to: "client_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      coach_set_client_display_name: {
        Args: { p_client_id: string; p_display_name: string }
        Returns: {
          auth_user_id: string
          bench_1rm_kg: number | null
          coach_id: string
          created_at: string
          deadlift_1rm_kg: number | null
          display_name: string
          email: string | null
          squat_1rm_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      coach_set_client_rep_maxes: {
        Args: {
          p_bench_kg: number
          p_client_id: string
          p_deadlift_kg: number
          p_squat_kg: number
        }
        Returns: {
          auth_user_id: string
          bench_1rm_kg: number | null
          coach_id: string
          created_at: string
          deadlift_1rm_kg: number | null
          display_name: string
          email: string | null
          squat_1rm_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      coach_shift_workouts: {
        Args: { p_days_delta: number; p_workout_ids: string[] }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_workout_video: {
        Args: { p_exercise_index: number; p_path: string; p_workout_id: string }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      set_my_display_name: { Args: { p_display_name: string }; Returns: string }
      set_workout_client_exercise_notes: {
        Args: { p_notes: Json; p_workout_id: string }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_workout_completion: {
        Args: {
          p_client_note?: string
          p_done: boolean
          p_duration_seconds?: number
          p_started_at?: string
          p_workout_id: string
        }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_workout_exercise_completion: {
        Args: { p_completed: Json; p_workout_id: string }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_workout_results: {
        Args: { p_results: Json; p_workout_id: string }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_workout_videos: {
        Args: { p_videos: Json; p_workout_id: string }
        Returns: {
          actual_results: Json | null
          client_exercise_notes: Json | null
          client_id: string
          client_note: string | null
          client_videos: Json | null
          completed_at: string | null
          completed_exercises: Json | null
          created_at: string
          cycle_id: string | null
          cycle_lift: string | null
          cycle_week: number | null
          duration_seconds: number | null
          exercises: Json
          id: string
          notes: string | null
          scheduled_date: string
          started_at: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "workouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      workout_build_main_531_sets_json: {
        Args: { tm_kg: number; wave_week: number }
        Returns: Json
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
      workout_round_down_step: {
        Args: { step: number; weight: number }
        Returns: number
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
