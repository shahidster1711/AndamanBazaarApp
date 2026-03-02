/**
 * Hand-written DB types for the planner schema.
 * In production, replace with `supabase gen types typescript` output.
 * Using createClient<Database> ensures type-safe queries.
 */
export interface Database {
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
          updated_at?: string;
        };
        Relationships: [];
      };
      itineraries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          preferences: Record<string, unknown>;
          days: Record<string, unknown>[];
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
          preferences: Record<string, unknown>;
          days: Record<string, unknown>[];
          estimated_budget_range?: string | null;
          islands_covered?: string[] | null;
          model_version: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          preferences?: Record<string, unknown>;
          days?: Record<string, unknown>[];
          estimated_budget_range?: string | null;
          islands_covered?: string[] | null;
          model_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          action?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
