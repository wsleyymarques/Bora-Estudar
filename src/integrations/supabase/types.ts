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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          reference_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reference_date: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reference_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_goal_minutes: number
          daily_goal_reached: boolean
          full_name: string
          id: string
          last_processed_date: string | null
          last_streak_date: string | null
          minutes_today: number
          onboarding_completed: boolean
          profile_private: boolean
          streak_current: number
          updated_at: string
          weekly_goal_minutes: number
          xp_total: number
          xp_weekly: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number
          daily_goal_reached?: boolean
          full_name?: string
          id: string
          last_processed_date?: string | null
          last_streak_date?: string | null
          minutes_today?: number
          onboarding_completed?: boolean
          profile_private?: boolean
          streak_current?: number
          updated_at?: string
          weekly_goal_minutes?: number
          xp_total?: number
          xp_weekly?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number
          daily_goal_reached?: boolean
          full_name?: string
          id?: string
          last_processed_date?: string | null
          last_streak_date?: string | null
          minutes_today?: number
          onboarding_completed?: boolean
          profile_private?: boolean
          streak_current?: number
          updated_at?: string
          weekly_goal_minutes?: number
          xp_total?: number
          xp_weekly?: number
        }
        Relationships: []
      }
      study_reward_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          user_id: string
          week_start: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          user_id: string
          week_start: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          user_id?: string
          week_start?: string
          xp_amount?: number
        }
        Relationships: []
      }
      schedule_day_plans: {
        Row: {
          created_at: string
          date: string
          day_note: string | null
          day_target_minutes: number | null
          id: string
          is_override: boolean
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_note?: string | null
          day_target_minutes?: number | null
          id?: string
          is_override?: boolean
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_note?: string | null
          day_target_minutes?: number | null
          id?: string
          is_override?: boolean
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_day_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "weekly_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_entries: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          day_note: string | null
          id: string
          is_override: boolean
          item_note: string | null
          optional: boolean
          planned_minutes: number | null
          sort_order: number
          start_time: string | null
          subject_id: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          day_note?: string | null
          id?: string
          is_override?: boolean
          item_note?: string | null
          optional?: boolean
          planned_minutes?: number | null
          sort_order?: number
          start_time?: string | null
          subject_id: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          day_note?: string | null
          id?: string
          is_override?: boolean
          item_note?: string | null
          optional?: boolean
          planned_minutes?: number | null
          sort_order?: number
          start_time?: string | null
          subject_id?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "weekly_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          date: string
          duration_minutes: number
          end_time: string | null
          id: string
          note: string | null
          start_time: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          note?: string | null
          start_time: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          note?: string | null
          start_time?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          active: boolean
          category: string | null
          color: string
          created_at: string
          id: string
          monthly_goal_hours: number
          name: string
          optional: boolean
          sort_order: number
          updated_at: string
          user_id: string
          weekly_goal_hours: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          color?: string
          created_at?: string
          id?: string
          monthly_goal_hours?: number
          name: string
          optional?: boolean
          sort_order?: number
          updated_at?: string
          user_id: string
          weekly_goal_hours?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          color?: string
          created_at?: string
          id?: string
          monthly_goal_hours?: number
          name?: string
          optional?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string
          weekly_goal_hours?: number
        }
        Relationships: []
      }
      weekly_template_day_notes: {
        Row: {
          content: string
          day_of_week: number
          id: string
          target_minutes: number | null
          template_id: string
        }
        Insert: {
          content?: string
          day_of_week: number
          id?: string
          target_minutes?: number | null
          template_id: string
        }
        Update: {
          content?: string
          day_of_week?: number
          id?: string
          target_minutes?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_template_day_notes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "weekly_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_template_items: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          item_note: string | null
          optional: boolean
          planned_minutes: number | null
          sort_order: number
          start_time: string | null
          subject_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          item_note?: string | null
          optional?: boolean
          planned_minutes?: number | null
          sort_order?: number
          start_time?: string | null
          subject_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          item_note?: string | null
          optional?: boolean
          planned_minutes?: number | null
          sort_order?: number
          start_time?: string | null
          subject_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_template_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "weekly_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_weekly_ranking: {
        Args: {
          target_date?: string
          limit_count?: number
        }
        Returns: {
          avatar_url: string | null
          full_name: string
          minutes_week: number
          rank_position: number
          streak_current: number
          user_id: string
          xp_weekly: number
        }[]
      }
      process_daily_streak_rollover: {
        Args: {
          process_date?: string
        }
        Returns: number
      }
      refresh_user_engagement: {
        Args: {
          target_user_id: string
          target_date?: string
        }
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
