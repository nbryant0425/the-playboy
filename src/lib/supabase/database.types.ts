// Hand-written to match supabase/migrations/0001_init.sql.
// If you use the Supabase CLI, you can replace this with `supabase gen types typescript`.
export interface Database {
  public: {
    Tables: {
      issues: {
        Row: {
          id: string;
          year: number;
          issue_period: string;
          display_label: string;
          cover_model: string | null;
          playmate_name: string | null;
          interview_subject: string | null;
          notable_cover_names: string | null;
          synopsis: string | null;
          source_confidence: "verified" | "wikipedia-sourced" | "needs-verification" | "unknown";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["issues"]["Row"]> & {
          year: number;
          issue_period: string;
          display_label: string;
        };
        Update: Partial<Database["public"]["Tables"]["issues"]["Row"]>;
        Relationships: [];
      };
      user_collection: {
        Row: {
          id: string;
          user_id: string;
          issue_id: string;
          owned: boolean;
          photo_url: string | null;
          condition_notes: string | null;
          added_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_collection"]["Row"]> & {
          user_id: string;
          issue_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_collection"]["Row"]>;
        Relationships: [];
      };
      issue_corrections: {
        Row: {
          id: string;
          issue_id: string;
          suggested_by: string;
          field: "cover_model" | "playmate_name" | "interview_subject" | "notable_cover_names" | "source_confidence";
          suggested_value: string;
          status: "pending" | "accepted" | "rejected";
          note: string | null;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["issue_corrections"]["Row"]> & {
          issue_id: string;
          suggested_by: string;
          field: "cover_model" | "playmate_name" | "interview_subject" | "notable_cover_names" | "source_confidence";
          suggested_value: string;
        };
        Update: Partial<Database["public"]["Tables"]["issue_corrections"]["Row"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tags"]["Row"]> & { user_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
        Relationships: [];
      };
      issue_tags: {
        Row: {
          id: string;
          tag_id: string;
          issue_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["issue_tags"]["Row"]> & {
          tag_id: string;
          issue_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["issue_tags"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
