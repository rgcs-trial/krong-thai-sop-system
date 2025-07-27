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
      auth_users: {
        Row: {
          id: string
          restaurant_id: string
          role: string
          full_name: string
          full_name_fr: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          role: string
          full_name: string
          full_name_fr: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          role?: string
          full_name?: string
          full_name_fr?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          name: string
          name_fr: string
          location: string
          contact_email: string
          contact_phone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_fr: string
          location: string
          contact_email: string
          contact_phone: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_fr?: string
          location?: string
          contact_email?: string
          contact_phone?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sop_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          name_fr: string
          description: string | null
          description_fr: string | null
          icon: string | null
          color: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          name_fr: string
          description?: string | null
          description_fr?: string | null
          icon?: string | null
          color?: string | null
          sort_order: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          name_fr?: string
          description?: string | null
          description_fr?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sop_documents: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string
          title: string
          title_fr: string
          content: string
          content_fr: string
          version: string
          status: string
          tags: string[]
          difficulty_level: string
          estimated_read_time: number
          last_reviewed_at: string | null
          review_due_date: string | null
          created_by: string
          updated_by: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id: string
          title: string
          title_fr: string
          content: string
          content_fr: string
          version: string
          status: string
          tags: string[]
          difficulty_level: string
          estimated_read_time: number
          last_reviewed_at?: string | null
          review_due_date?: string | null
          created_by: string
          updated_by: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          category_id?: string
          title?: string
          title_fr?: string
          content?: string
          content_fr?: string
          version?: string
          status?: string
          tags?: string[]
          difficulty_level?: string
          estimated_read_time?: number
          last_reviewed_at?: string | null
          review_due_date?: string | null
          created_by?: string
          updated_by?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      performance_metrics: {
        Row: {
          id: string
          restaurant_id: string
          metric_type: string
          metric_name: string
          metric_value: number
          measurement_unit: string
          timestamp: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          metric_type: string
          metric_name: string
          metric_value: number
          measurement_unit: string
          timestamp: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          metric_type?: string
          metric_name?: string
          metric_value?: number
          measurement_unit?: string
          timestamp?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      form_submissions: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string | null
          form_type: string
          form_data: Json
          submission_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id?: string | null
          form_type: string
          form_data: Json
          submission_status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string | null
          form_type?: string
          form_data?: Json
          submission_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      realtime_subscriptions: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          channel_name: string
          event_types: string[]
          is_active: boolean
          last_ping_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          channel_name: string
          event_types: string[]
          is_active?: boolean
          last_ping_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          channel_name?: string
          event_types?: string[]
          is_active?: boolean
          last_ping_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      system_alerts: {
        Row: {
          id: string
          restaurant_id: string
          alert_type: string
          severity: string
          title: string
          message: string
          source: string
          metadata: Json | null
          is_resolved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          alert_type: string
          severity: string
          title: string
          message: string
          source: string
          metadata?: Json | null
          is_resolved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          alert_type?: string
          severity?: string
          title?: string
          message?: string
          source?: string
          metadata?: Json | null
          is_resolved?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          session_token: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          session_token: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          session_token?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_bookmarks: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          sop_id: string
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          sop_id: string
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          sop_id?: string
          created_at?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          sop_id: string
          progress_percentage: number
          time_spent: number
          last_accessed: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          sop_id: string
          progress_percentage: number
          time_spent: number
          last_accessed: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          sop_id?: string
          progress_percentage?: number
          time_spent?: number
          last_accessed?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_progress_summary: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          total_sops: number
          completed_sops: number
          total_time_spent: number
          average_score: number
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          total_sops: number
          completed_sops: number
          total_time_spent: number
          average_score: number
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          total_sops?: number
          completed_sops?: number
          total_time_spent?: number
          average_score?: number
          updated_at?: string
        }
      }
      uploaded_files: {
        Row: {
          id: string
          restaurant_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          content_type?: string
          uploaded_by?: string
          created_at?: string
        }
      }
      form_templates: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string
          form_schema: Json
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description: string
          form_schema: Json
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          description?: string
          form_schema?: Json
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      training_modules: {
        Row: {
          id: string
          restaurant_id: string
          title: string
          title_fr: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          title: string
          title_fr: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          title?: string
          title_fr?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_training_progress: {
        Row: {
          id: string
          user_id: string
          module_id: string
          status: string
          progress_percentage: number
          completed_at: string | null
          time_spent_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          status: string
          progress_percentage: number
          completed_at?: string | null
          time_spent_minutes: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module_id?: string
          status?: string
          progress_percentage?: number
          completed_at?: string | null
          time_spent_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      training_assessments: {
        Row: {
          id: string
          module_id: string
          status: string
          score_percentage: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          status: string
          score_percentage: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          status?: string
          score_percentage?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      training_certificates: {
        Row: {
          id: string
          module_id: string
          status: string
          expires_at: string
          issued_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          status: string
          expires_at: string
          issued_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          status?: string
          expires_at?: string
          issued_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never