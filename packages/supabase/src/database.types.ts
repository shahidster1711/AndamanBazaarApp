/*
 * Supabase DB types.
 * Regenerate from a linked project with:
 * npx supabase gen types typescript --linked --schema public,planner > packages/supabase/src/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  planner: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          home_city: string | null;
          typical_budget_range: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          home_city?: string | null;
          typical_budget_range?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          home_city?: string | null;
          typical_budget_range?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedSchema: "auth";
            referencedColumns: ["id"];
          },
        ];
      };
      itineraries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          preferences: Json;
          days: Json;
          estimated_budget_range: string | null;
          islands_covered: string[] | null;
          model_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          preferences: Json;
          days: Json;
          estimated_budget_range?: string | null;
          islands_covered?: string[] | null;
          model_version: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          preferences?: Json;
          days?: Json;
          estimated_budget_range?: string | null;
          islands_covered?: string[] | null;
          model_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "itineraries_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedSchema: "auth";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
