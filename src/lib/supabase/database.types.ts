export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ResumesRow = {
  content_type: string;
  created_at: string;
  extracted_text: string | null;
  file_size_bytes: number;
  id: string;
  is_active: boolean;
  original_file_name: string;
  parse_error: string | null;
  parse_status: "pending" | "processing" | "complete" | "failed";
  storage_bucket: string;
  storage_path: string;
  updated_at: string;
  user_id: string;
};

type ResumesInsert = {
  content_type?: string;
  created_at?: string;
  extracted_text?: string | null;
  file_size_bytes: number;
  id?: string;
  is_active?: boolean;
  original_file_name: string;
  parse_error?: string | null;
  parse_status?: "pending" | "processing" | "complete" | "failed";
  storage_bucket?: string;
  storage_path: string;
  updated_at?: string;
  user_id: string;
};

type ResumesUpdate = Partial<ResumesInsert>;

type ResumeEntityRow = {
  created_at: string;
  description: string | null;
  entity_type:
    | "skill"
    | "education"
    | "experience"
    | "certification"
    | "title"
    | "industry"
    | "seniority"
    | "summary";
  id: string;
  label: string;
  metadata: Json;
  resume_id: string | null;
  source: "resume" | "user" | "ai";
  updated_at: string;
  user_id: string;
};

type ResumeEntityInsert = {
  created_at?: string;
  description?: string | null;
  entity_type:
    | "skill"
    | "education"
    | "experience"
    | "certification"
    | "title"
    | "industry"
    | "seniority"
    | "summary";
  id?: string;
  label: string;
  metadata?: Json;
  resume_id?: string | null;
  source?: "resume" | "user" | "ai";
  updated_at?: string;
  user_id: string;
};

type ResumeEntityUpdate = Partial<ResumeEntityInsert>;

type UserPreferencesRow = {
  created_at: string;
  desired_titles: string[];
  employment_types: string[];
  experience_level: string | null;
  excluded_industries: string[];
  excluded_titles: string[];
  min_salary_usd: number | null;
  preferred_locations: string[];
  updated_at: string;
  user_id: string;
  willing_to_relocate: boolean;
  work_modes: string[];
};

type UserPreferencesInsert = {
  created_at?: string;
  desired_titles?: string[];
  employment_types?: string[];
  experience_level?: string | null;
  excluded_industries?: string[];
  excluded_titles?: string[];
  min_salary_usd?: number | null;
  preferred_locations?: string[];
  updated_at?: string;
  user_id: string;
  willing_to_relocate?: boolean;
  work_modes?: string[];
};

type UserPreferencesUpdate = Partial<UserPreferencesInsert>;

type UserEmbeddingRow = {
  content_hash: string;
  created_at: string;
  embedding: number[];
  embedding_dimensions: number;
  embedding_model: string;
  id: string;
  resume_id: string | null;
  updated_at: string;
  user_id: string;
};

type UserEmbeddingInsert = {
  content_hash: string;
  created_at?: string;
  embedding: number[];
  embedding_dimensions?: number;
  embedding_model: string;
  id?: string;
  resume_id?: string | null;
  updated_at?: string;
  user_id: string;
};

type UserEmbeddingUpdate = Partial<UserEmbeddingInsert>;

type ProfilesRow = {
  avatar_url: string | null;
  created_at: string;
  full_name: string | null;
  id: string;
  onboarding_completed_at: string | null;
  updated_at: string;
};

type ProfilesInsert = {
  avatar_url?: string | null;
  created_at?: string;
  full_name?: string | null;
  id: string;
  onboarding_completed_at?: string | null;
  updated_at?: string;
};

type ProfilesUpdate = Partial<ProfilesInsert>;

// Minimal local type map for tables the app currently writes.
// Replace this with generated Supabase types once the remote schema is stable.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: ProfilesUpdate;
        Relationships: [];
      };
      resumes: {
        Row: ResumesRow;
        Insert: ResumesInsert;
        Update: ResumesUpdate;
        Relationships: [];
      };
      resume_entities: {
        Row: ResumeEntityRow;
        Insert: ResumeEntityInsert;
        Update: ResumeEntityUpdate;
        Relationships: [];
      };
      user_preferences: {
        Row: UserPreferencesRow;
        Insert: UserPreferencesInsert;
        Update: UserPreferencesUpdate;
        Relationships: [];
      };
      user_embeddings: {
        Row: UserEmbeddingRow;
        Insert: UserEmbeddingInsert;
        Update: UserEmbeddingUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
