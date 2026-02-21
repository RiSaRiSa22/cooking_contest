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
      competitions: {
        Row: {
          admin_pwd_hash: string
          allow_guests: boolean
          code: string
          created_at: string
          id: string
          max_participants: number | null
          name: string
          phase: string
        }
        Insert: {
          admin_pwd_hash: string
          allow_guests?: boolean
          code: string
          created_at?: string
          id?: string
          max_participants?: number | null
          name: string
          phase?: string
        }
        Update: {
          admin_pwd_hash?: string
          allow_guests?: boolean
          code?: string
          created_at?: string
          id?: string
          max_participants?: number | null
          name?: string
          phase?: string
        }
        Relationships: []
      }
      dishes: {
        Row: {
          chef_name: string
          competition_id: string
          created_at: string
          id: string
          ingredients: string | null
          name: string
          participant_id: string | null
          recipe: string | null
          story: string | null
        }
        Insert: {
          chef_name: string
          competition_id: string
          created_at?: string
          id?: string
          ingredients?: string | null
          name: string
          participant_id?: string | null
          recipe?: string | null
          story?: string | null
        }
        Update: {
          chef_name?: string
          competition_id?: string
          created_at?: string
          id?: string
          ingredients?: string | null
          name?: string
          participant_id?: string | null
          recipe?: string | null
          story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          competition_code: string
          id: string
          nickname: string
        }
        Insert: {
          attempted_at?: string
          competition_code: string
          id?: string
          nickname: string
        }
        Update: {
          attempted_at?: string
          competition_code?: string
          id?: string
          nickname?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          competition_id: string
          id: string
          joined_at: string
          nickname: string
          pin_hash: string
          role: string
        }
        Insert: {
          competition_id: string
          id?: string
          joined_at?: string
          nickname: string
          pin_hash: string
          role?: string
        }
        Update: {
          competition_id?: string
          id?: string
          joined_at?: string
          nickname?: string
          pin_hash?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          is_extra: boolean
          order: number
          url: string
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          is_extra?: boolean
          order?: number
          url: string
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          is_extra?: boolean
          order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          competition_id: string
          created_at: string
          dish_id: string
          id: string
          participant_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          dish_id: string
          id?: string
          participant_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          dish_id?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dishes_public: {
        Row: {
          chef_name: string | null
          competition_id: string | null
          created_at: string | null
          id: string | null
          ingredients: string | null
          name: string | null
          participant_id: string | null
          recipe: string | null
          story: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
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

// Convenience type for the dishes_public view (auto-filtered by phase)
export type DishPublic = Database['public']['Views']['dishes_public']['Row']
