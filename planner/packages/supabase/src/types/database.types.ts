/**
 * database.types.ts
 *
 * Typed representation of the Supabase Postgres schema used by
 * Andaman Planner Pro.  This file covers ONLY the "planner" schema.
 *
 * How to regenerate when schema changes:
 *   npx supabase gen types typescript \
 *     --project-id <your-project-id> \
 *     --schema planner \
 *     > packages/supabase/src/types/database.types.ts
 *
 * The createClient<Database> pattern ensures every query is type-safe.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  planner: {
    Tables: {
      profiles: {
        Row: {
          id: string
          home_city: string | null
          typical_budget_range: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          home_city?: string | null
          typical_budget_range?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          home_city?: string | null
          typical_budget_range?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      itineraries: {
        Row: {
          id: string
          user_id: string
          name: string
          start_date: string
          end_date: string
          preferences: Json
          days: Json
          islands_covered: string[]
          estimated_budget_range: string | null
          model_version: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          start_date: string
          end_date: string
          preferences: Json
          days: Json
          islands_covered?: string[]
          estimated_budget_range?: string | null
          model_version: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          start_date?: string
          end_date?: string
          preferences?: Json
          days?: Json
          islands_covered?: string[]
          estimated_budget_range?: string | null
          model_version?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rate_limits: {
        Row: {
          id: number
          user_id: string
          action: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          action?: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          action?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

/** Convenience aliases */
export type PlannerDB = Database["planner"]
export type ItineraryRow = PlannerDB["Tables"]["itineraries"]["Row"]
export type ItineraryInsert = PlannerDB["Tables"]["itineraries"]["Insert"]
export type ProfileRow = PlannerDB["Tables"]["profiles"]["Row"]
export type ProfileInsert = PlannerDB["Tables"]["profiles"]["Insert"]
export type RateLimitRow = PlannerDB["Tables"]["rate_limits"]["Row"]
export type RateLimitInsert = PlannerDB["Tables"]["rate_limits"]["Insert"]
