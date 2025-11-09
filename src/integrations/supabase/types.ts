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
      analysis_sessions: {
        Row: {
          completed_at: string | null
          documents_analyzed: number | null
          hidden_skills_count: number | null
          id: string
          session_status: string
          started_at: string
          total_skills_found: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          documents_analyzed?: number | null
          hidden_skills_count?: number | null
          id?: string
          session_status?: string
          started_at?: string
          total_skills_found?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          documents_analyzed?: number | null
          hidden_skills_count?: number | null
          id?: string
          session_status?: string
          started_at?: string
          total_skills_found?: number | null
          user_id?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          file_path: string | null
          id: string
          processed: boolean | null
          raw_data: Json | null
          source_name: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          source_url: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_path?: string | null
          id?: string
          processed?: boolean | null
          raw_data?: Json | null
          source_name?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_path?: string | null
          id?: string
          processed?: boolean | null
          raw_data?: Json | null
          source_name?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          processing_status: string
          upload_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          processing_status?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          processing_status?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      extracted_skills: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          is_hidden: boolean | null
          last_used: string | null
          proficiency_level:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          skill_name: string
          skill_profile_id: string
          skill_taxonomy_id: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          confidence_score: number
          created_at?: string
          id?: string
          is_hidden?: boolean | null
          last_used?: string | null
          proficiency_level?:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          skill_name: string
          skill_profile_id: string
          skill_taxonomy_id?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          is_hidden?: boolean | null
          last_used?: string | null
          proficiency_level?:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          skill_name?: string
          skill_profile_id?: string
          skill_taxonomy_id?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_skills_skill_profile_id_fkey"
            columns: ["skill_profile_id"]
            isOneToOne: false
            referencedRelation: "skill_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_skills_skill_taxonomy_id_fkey"
            columns: ["skill_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "skill_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      job_match_skills: {
        Row: {
          created_at: string
          id: string
          is_critical: boolean
          is_matched: boolean
          job_match_id: string
          required_level: string
          skill_name: string
          user_confidence: number | null
          user_proficiency: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_critical?: boolean
          is_matched?: boolean
          job_match_id: string
          required_level?: string
          skill_name: string
          user_confidence?: number | null
          user_proficiency?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_critical?: boolean
          is_matched?: boolean
          job_match_id?: string
          required_level?: string
          skill_name?: string
          user_confidence?: number | null
          user_proficiency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_match_skills_job_match_id_fkey"
            columns: ["job_match_id"]
            isOneToOne: false
            referencedRelation: "job_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      job_matches: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          job_company: string | null
          job_description: string
          job_title: string
          match_score: number
          matched_skills_count: number
          missing_skills_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          job_company?: string | null
          job_description: string
          job_title: string
          match_score?: number
          matched_skills_count?: number
          missing_skills_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          job_company?: string | null
          job_description?: string
          job_title?: string
          match_score?: number
          matched_skills_count?: number
          missing_skills_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_requirements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      required_skills: {
        Row: {
          created_at: string
          id: string
          importance: string
          job_requirement_id: string
          proficiency_level: string
          skill_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          importance?: string
          job_requirement_id: string
          proficiency_level: string
          skill_name: string
        }
        Update: {
          created_at?: string
          id?: string
          importance?: string
          job_requirement_id?: string
          proficiency_level?: string
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "required_skills_job_requirement_id_fkey"
            columns: ["job_requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_evidence: {
        Row: {
          context: string | null
          created_at: string
          document_id: string
          evidence_text: string
          evidence_type: string
          id: string
          reliability_score: number
          skill_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          document_id: string
          evidence_text: string
          evidence_type: string
          id?: string
          reliability_score: number
          skill_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          document_id?: string
          evidence_text?: string
          evidence_type?: string
          id?: string
          reliability_score?: number
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_evidence_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_profiles: {
        Row: {
          completeness_score: number | null
          created_at: string
          id: string
          privacy_level: Database["public"]["Enums"]["privacy_level"] | null
          total_skills: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completeness_score?: number | null
          created_at?: string
          id?: string
          privacy_level?: Database["public"]["Enums"]["privacy_level"] | null
          total_skills?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completeness_score?: number | null
          created_at?: string
          id?: string
          privacy_level?: Database["public"]["Enums"]["privacy_level"] | null
          total_skills?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_taxonomy: {
        Row: {
          aliases: string[] | null
          category: string
          created_at: string
          description: string | null
          id: string
          skill_name: string
          subcategory: string | null
        }
        Insert: {
          aliases?: string[] | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          skill_name: string
          subcategory?: string | null
        }
        Update: {
          aliases?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          skill_name?: string
          subcategory?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          confidence_score: number
          created_at: string
          evidence_trail: Json | null
          id: string
          is_explicit: boolean
          last_used_date: string | null
          proficiency_level: string
          skill_category: string
          skill_name: string
          source_documents: Json | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          confidence_score: number
          created_at?: string
          evidence_trail?: Json | null
          id?: string
          is_explicit?: boolean
          last_used_date?: string | null
          proficiency_level: string
          skill_category: string
          skill_name: string
          source_documents?: Json | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          evidence_trail?: Json | null
          id?: string
          is_explicit?: boolean
          last_used_date?: string | null
          proficiency_level?: string
          skill_category?: string
          skill_name?: string
          source_documents?: Json | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      evidence_type:
        | "explicit_mention"
        | "code_repository"
        | "project"
        | "certification"
        | "endorsement"
        | "achievement"
        | "tool_usage"
      privacy_level: "public" | "internal" | "private"
      proficiency_level: "beginner" | "intermediate" | "advanced" | "expert"
      source_type:
        | "cv"
        | "linkedin"
        | "github"
        | "blog"
        | "performance_review"
        | "other"
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
      evidence_type: [
        "explicit_mention",
        "code_repository",
        "project",
        "certification",
        "endorsement",
        "achievement",
        "tool_usage",
      ],
      privacy_level: ["public", "internal", "private"],
      proficiency_level: ["beginner", "intermediate", "advanced", "expert"],
      source_type: [
        "cv",
        "linkedin",
        "github",
        "blog",
        "performance_review",
        "other",
      ],
    },
  },
} as const
