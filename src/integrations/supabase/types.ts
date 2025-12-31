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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      freelancer_submissions: {
        Row: {
          admin_feedback: string | null
          bio: string | null
          created_at: string
          full_name: string
          hourly_rate: string | null
          id: string
          portfolio_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skills: string[]
          status: Database["public"]["Enums"]["submission_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_feedback?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          hourly_rate?: string | null
          id?: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["submission_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_feedback?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          hourly_rate?: string | null
          id?: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["submission_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      freelancers: {
        Row: {
          bio: string | null
          created_at: string
          full_name: string
          hourly_rate: string | null
          id: string
          portfolio_url: string | null
          skills: string[]
          submission_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          full_name: string
          hourly_rate?: string | null
          id?: string
          portfolio_url?: string | null
          skills?: string[]
          submission_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          full_name?: string
          hourly_rate?: string | null
          id?: string
          portfolio_url?: string | null
          skills?: string[]
          submission_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "freelancer_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_submissions: {
        Row: {
          admin_feedback: string | null
          apply_url: string | null
          category: string
          company: string
          created_at: string
          description: string | null
          employment_type: string
          id: string
          location: string
          location_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          salary: string | null
          status: Database["public"]["Enums"]["submission_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_feedback?: string | null
          apply_url?: string | null
          category?: string
          company: string
          created_at?: string
          description?: string | null
          employment_type?: string
          id?: string
          location: string
          location_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_feedback?: string | null
          apply_url?: string | null
          category?: string
          company?: string
          created_at?: string
          description?: string | null
          employment_type?: string
          id?: string
          location?: string
          location_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string | null
          category: string
          company: string
          created_at: string
          description: string | null
          employment_type: string
          external_id: string | null
          id: string
          location: string
          location_type: string
          posted_at: string | null
          salary: string | null
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          category?: string
          company: string
          created_at?: string
          description?: string | null
          employment_type?: string
          external_id?: string | null
          id?: string
          location: string
          location_type?: string
          posted_at?: string | null
          salary?: string | null
          source: string
          title: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          category?: string
          company?: string
          created_at?: string
          description?: string | null
          employment_type?: string
          external_id?: string | null
          id?: string
          location?: string
          location_type?: string
          posted_at?: string | null
          salary?: string | null
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      submission_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      submission_status: ["pending", "approved", "rejected"],
    },
  },
} as const
