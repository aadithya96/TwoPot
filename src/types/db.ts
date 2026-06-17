// AUTO-GENERATED — run: supabase gen types typescript --local > src/types/db.ts
// This is a hand-written stub matching the schema in supabase/migrations so the
// app type-checks before a local Supabase instance is available to generate from.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          notification_prefs: Json
          dark_mode: boolean
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          notification_prefs?: Json
          dark_mode?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      households: {
        Row: {
          id: string
          name: string
          invite_code: string | null
          invite_expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['households']['Insert']>
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['household_members']['Insert']>
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          icon: string
          color: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          icon?: string
          color?: string
          is_default?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          household_id: string
          category_id: string | null
          paid_by: string
          owner: 'shared' | 'personal'
          personal_user_id: string | null
          amount: number
          description: string
          notes: string | null
          date: string
          split_type: 'equal' | 'custom' | 'payer_covers'
          split_pct_a: number | null
          is_recurring: boolean
          recurrence_rule: string | null
          receipt_url: string | null
          goal_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id?: string | null
          paid_by: string
          owner?: 'shared' | 'personal'
          personal_user_id?: string | null
          amount: number
          description: string
          notes?: string | null
          date?: string
          split_type?: 'equal' | 'custom' | 'payer_covers'
          split_pct_a?: number | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          receipt_url?: string | null
          goal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      budgets: {
        Row: {
          id: string
          household_id: string
          category_id: string
          amount: number
          period: 'monthly' | 'yearly'
          rollover: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          amount: number
          period?: 'monthly' | 'yearly'
          rollover?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
      }
      savings_goals: {
        Row: {
          id: string
          household_id: string
          name: string
          icon: string
          color: string
          target_amount: number
          current_amount: number
          deadline: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          icon?: string
          color?: string
          target_amount: number
          current_amount?: number
          deadline?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['savings_goals']['Insert']>
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          amount: number
          note?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['goal_contributions']['Insert']>
      }
      settlements: {
        Row: {
          id: string
          household_id: string
          period_month: string
          amount: number
          owed_by: string
          owed_to: string
          settled: boolean
          settled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          period_month: string
          amount: number
          owed_by: string
          owed_to: string
          settled?: boolean
          settled_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['settlements']['Insert']>
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
    }
    Views: {
      budget_usage: {
        Row: {
          household_id: string
          category_id: string
          category_name: string
          category_icon: string
          category_color: string
          budget_amount: number
          spent_amount: number
          period_month: string
        }
      }
      monthly_settlement: {
        Row: {
          household_id: string
          period_month: string
          owed_by: string
          owed_to: string
          amount: number
        }
      }
    }
    Functions: {
      generate_invite: {
        Args: { household_id: string }
        Returns: string
      }
      accept_invite: {
        Args: { code: string }
        Returns: string
      }
      seed_default_categories: {
        Args: { hid: string }
        Returns: void
      }
      increment_goal_amount: {
        Args: { goal_id: string; delta: number }
        Returns: void
      }
      compute_settlement: {
        Args: { household_id: string; period_month: string }
        Returns: {
          owed_by: string
          owed_to: string
          amount: number
        }[]
      }
      is_household_member: {
        Args: { hid: string }
        Returns: boolean
      }
      process_budget_rollover: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
  }
}
