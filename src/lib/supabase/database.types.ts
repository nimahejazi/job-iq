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

// Minimal local type map for tables the app currently writes.
// Replace this with generated Supabase types once the remote schema is stable.
export type Database = {
  public: {
    Tables: {
      resumes: {
        Row: ResumesRow;
        Insert: ResumesInsert;
        Update: ResumesUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
