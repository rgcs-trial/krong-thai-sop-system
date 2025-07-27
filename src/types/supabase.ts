// Restaurant Krong Thai SOP Management System
// Supabase Generated Types
// This file represents the database schema from all migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          name_th: string | null
          address: string | null
          address_th: string | null
          phone: string | null
          email: string | null
          timezone: string
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_th?: string | null
          address?: string | null
          address_th?: string | null
          phone?: string | null
          email?: string | null
          timezone?: string
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_th?: string | null
          address?: string | null
          address_th?: string | null
          phone?: string | null
          email?: string | null
          timezone?: string
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_users: {
        Row: {
          id: string
          email: string
          pin_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
          full_name: string
          full_name_th: string | null
          phone: string | null
          position: string | null
          position_th: string | null
          restaurant_id: string
          is_active: boolean
          last_login_at: string | null
          pin_changed_at: string | null
          pin_attempts: number
          locked_until: string | null
          device_fingerprint: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          full_name: string
          full_name_th?: string | null
          phone?: string | null
          position?: string | null
          position_th?: string | null
          restaurant_id: string
          is_active?: boolean
          last_login_at?: string | null
          pin_changed_at?: string | null
          pin_attempts?: number
          locked_until?: string | null
          device_fingerprint?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          full_name?: string
          full_name_th?: string | null
          phone?: string | null
          position?: string | null
          position_th?: string | null
          restaurant_id?: string
          is_active?: boolean
          last_login_at?: string | null
          pin_changed_at?: string | null
          pin_attempts?: number
          locked_until?: string | null
          device_fingerprint?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      sop_categories: {
        Row: {
          id: string
          code: string
          name: string
          name_th: string
          description: string | null
          description_th: string | null
          icon: string | null
          color: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          name_th: string
          description?: string | null
          description_th?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          name_th?: string
          description?: string | null
          description_th?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sop_documents: {
        Row: {
          id: string
          category_id: string
          restaurant_id: string
          title: string
          title_th: string
          content: string
          content_th: string
          steps: Json | null
          steps_th: Json | null
          attachments: Json
          tags: string[] | null
          tags_th: string[] | null
          version: number
          status: Database["public"]["Enums"]["sop_status"]
          priority: Database["public"]["Enums"]["sop_priority"]
          effective_date: string | null
          review_date: string | null
          created_by: string
          updated_by: string | null
          approved_by: string | null
          approved_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          restaurant_id: string
          title: string
          title_th: string
          content: string
          content_th: string
          steps?: Json | null
          steps_th?: Json | null
          attachments?: Json
          tags?: string[] | null
          tags_th?: string[] | null
          version?: number
          status?: Database["public"]["Enums"]["sop_status"]
          priority?: Database["public"]["Enums"]["sop_priority"]
          effective_date?: string | null
          review_date?: string | null
          created_by: string
          updated_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          restaurant_id?: string
          title?: string
          title_th?: string
          content?: string
          content_th?: string
          steps?: Json | null
          steps_th?: Json | null
          attachments?: Json
          tags?: string[] | null
          tags_th?: string[] | null
          version?: number
          status?: Database["public"]["Enums"]["sop_status"]
          priority?: Database["public"]["Enums"]["sop_priority"]
          effective_date?: string | null
          review_date?: string | null
          created_by?: string
          updated_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sop_category"
            columns: ["category_id"]
            referencedRelation: "sop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sop_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sop_created_by"
            columns: ["created_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sop_updated_by"
            columns: ["updated_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sop_approved_by"
            columns: ["approved_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
      form_templates: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          name_th: string
          description: string | null
          description_th: string | null
          category: string | null
          schema: Json
          schema_th: Json | null
          validation_rules: Json
          settings: Json
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          name_th: string
          description?: string | null
          description_th?: string | null
          category?: string | null
          schema: Json
          schema_th?: Json | null
          validation_rules?: Json
          settings?: Json
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          name_th?: string
          description?: string | null
          description_th?: string | null
          category?: string | null
          schema?: Json
          schema_th?: Json | null
          validation_rules?: Json
          settings?: Json
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_form_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_form_created_by"
            columns: ["created_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
      form_submissions: {
        Row: {
          id: string
          template_id: string
          restaurant_id: string
          submitted_by: string
          data: Json
          attachments: Json
          location: string | null
          ip_address: unknown | null
          user_agent: string | null
          submission_date: string
          status: Database["public"]["Enums"]["submission_status"]
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          notes_th: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          restaurant_id: string
          submitted_by: string
          data: Json
          attachments?: Json
          location?: string | null
          ip_address?: unknown | null
          user_agent?: string | null
          submission_date?: string
          status?: Database["public"]["Enums"]["submission_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          notes_th?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          restaurant_id?: string
          submitted_by?: string
          data?: Json
          attachments?: Json
          location?: string | null
          ip_address?: unknown | null
          user_agent?: string | null
          submission_date?: string
          status?: Database["public"]["Enums"]["submission_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          notes_th?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_submission_template"
            columns: ["template_id"]
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_submission_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_submission_user"
            columns: ["submitted_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_submission_reviewer"
            columns: ["reviewed_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string | null
          action: Database["public"]["Enums"]["audit_action"]
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          metadata: Json
          ip_address: unknown | null
          user_agent: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id?: string | null
          action: Database["public"]["Enums"]["audit_action"]
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          metadata?: Json
          ip_address?: unknown | null
          user_agent?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string | null
          action?: Database["public"]["Enums"]["audit_action"]
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          metadata?: Json
          ip_address?: unknown | null
          user_agent?: string | null
          session_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_user"
            columns: ["user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          device_id: string | null
          expires_at: string
          is_active: boolean
          last_accessed_at: string | null
          session_type: string
          location_bound_restaurant_id: string | null
          ip_address: unknown | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          device_id?: string | null
          expires_at: string
          is_active?: boolean
          last_accessed_at?: string | null
          session_type?: string
          location_bound_restaurant_id?: string | null
          ip_address?: unknown | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          device_id?: string | null
          expires_at?: string
          is_active?: boolean
          last_accessed_at?: string | null
          session_type?: string
          location_bound_restaurant_id?: string | null
          ip_address?: unknown | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_session_user"
            columns: ["user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_session_location_restaurant"
            columns: ["location_bound_restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      location_sessions: {
        Row: {
          id: string
          restaurant_id: string
          tablet_device_id: string
          session_token: string
          name: string
          location: string | null
          ip_address: unknown | null
          user_agent: string | null
          is_active: boolean
          expires_at: string
          last_staff_login_at: string | null
          last_staff_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          tablet_device_id: string
          session_token: string
          name: string
          location?: string | null
          ip_address?: unknown | null
          user_agent?: string | null
          is_active?: boolean
          expires_at: string
          last_staff_login_at?: string | null
          last_staff_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          tablet_device_id?: string
          session_token?: string
          name?: string
          location?: string | null
          ip_address?: unknown | null
          user_agent?: string | null
          is_active?: boolean
          expires_at?: string
          last_staff_login_at?: string | null
          last_staff_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_location_session_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_location_session_last_user"
            columns: ["last_staff_user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_bookmarks: {
        Row: {
          id: string
          user_id: string
          sop_id: string
          restaurant_id: string
          notes: string | null
          notes_th: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sop_id: string
          restaurant_id: string
          notes?: string | null
          notes_th?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sop_id?: string
          restaurant_id?: string
          notes?: string | null
          notes_th?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bookmark_user"
            columns: ["user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookmark_sop"
            columns: ["sop_id"]
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookmark_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          sop_id: string
          restaurant_id: string
          action: string
          duration: number | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sop_id: string
          restaurant_id: string
          action: string
          duration?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sop_id?: string
          restaurant_id?: string
          action?: string
          duration?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_progress_user"
            columns: ["user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_progress_sop"
            columns: ["sop_id"]
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_progress_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      user_progress_summary: {
        Row: {
          id: string
          user_id: string
          sop_id: string
          restaurant_id: string
          viewed_at: string | null
          completed_at: string | null
          downloaded_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sop_id: string
          restaurant_id: string
          viewed_at?: string | null
          completed_at?: string | null
          downloaded_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sop_id?: string
          restaurant_id?: string
          viewed_at?: string | null
          completed_at?: string | null
          downloaded_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_progress_summary_user"
            columns: ["user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_progress_summary_sop"
            columns: ["sop_id"]
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_progress_summary_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      uploaded_files: {
        Row: {
          id: string
          filename: string
          original_name: string
          mime_type: string
          size: number
          url: string
          thumbnail_url: string | null
          bucket: string
          path: string
          category: string
          sop_id: string | null
          restaurant_id: string
          uploaded_by: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filename: string
          original_name: string
          mime_type: string
          size: number
          url: string
          thumbnail_url?: string | null
          bucket: string
          path: string
          category: string
          sop_id?: string | null
          restaurant_id: string
          uploaded_by: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filename?: string
          original_name?: string
          mime_type?: string
          size?: number
          url?: string
          thumbnail_url?: string | null
          bucket?: string
          path?: string
          category?: string
          sop_id?: string | null
          restaurant_id?: string
          uploaded_by?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_file_sop"
            columns: ["sop_id"]
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_file_restaurant"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_file_uploader"
            columns: ["uploaded_by"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_devices: {
        Row: {
          id: string
          user_id: string
          fingerprint_hash: string
          name: string
          type: Database["public"]["Enums"]["device_type"]
          location: string | null
          user_agent: string | null
          ip_address: unknown | null
          is_active: boolean
          is_trusted: boolean
          registered_at: string
          last_used_at: string
          trusted_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          fingerprint_hash: string
          name: string
          type?: Database["public"]["Enums"]["device_type"]
          location?: string | null
          user_agent?: string | null
          ip_address?: unknown | null
          is_active?: boolean
          is_trusted?: boolean
          registered_at?: string
          last_used_at?: string
          trusted_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          fingerprint_hash?: string
          name?: string
          type?: Database["public"]["Enums"]["device_type"]
          location?: string | null
          user_agent?: string | null
          ip_address?: unknown | null
          is_active?: boolean
          is_trusted?: boolean
          registered_at?: string
          last_used_at?: string
          trusted_at?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_devices_user"
            columns: ["user_id"]
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_pin: {
        Args: {
          user_email: string
          pin_input: string
        }
        Returns: {
          user_id: string
          is_valid: boolean
          role: Database["public"]["Enums"]["user_role"]
          restaurant_id: string
          full_name: string
          full_name_th: string | null
        }[]
      }
      log_audit_event: {
        Args: {
          p_restaurant_id: string
          p_user_id: string | null
          p_action: Database["public"]["Enums"]["audit_action"]
          p_resource_type: string
          p_resource_id: string | null
          p_old_values: Json | null
          p_new_values: Json | null
          p_metadata: Json
        }
        Returns: string
      }
      create_location_session: {
        Args: {
          p_restaurant_id: string
          p_device_id: string
          p_location_name: string
          p_ip_address: unknown | null
          p_user_agent: string | null
        }
        Returns: string
      }
      cleanup_expired_location_sessions: {
        Args: {}
        Returns: number
      }
      get_user_progress_stats: {
        Args: {
          p_user_id: string
          p_restaurant_id: string
        }
        Returns: {
          total_sops: number
          viewed_sops: number
          completed_sops: number
          downloaded_sops: number
          bookmarked_sops: number
          progress_percentage: number
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "manager" | "staff"
      sop_status: "draft" | "review" | "approved" | "archived"
      sop_priority: "low" | "medium" | "high" | "critical"
      submission_status: "submitted" | "reviewed" | "approved" | "rejected"
      audit_action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "VIEW" | "DOWNLOAD" | "UPLOAD" | "APPROVE" | "REJECT"
      device_type: "tablet" | "desktop" | "mobile"
      training_status: "not_started" | "in_progress" | "completed" | "failed" | "expired"
      assessment_status: "pending" | "passed" | "failed" | "retake_required"
      certificate_status: "active" | "expired" | "revoked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]