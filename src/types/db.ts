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
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      households: {
        Row: {
          id: string
          name: string
          invite_code: string | null
          invite_expires_at: string | null
          income_split_enabled: boolean
          pot_enabled: boolean
          pot_allocation_rule: 'equal' | 'proportional' | 'custom'
          shared_pot_target: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          income_split_enabled?: boolean
          pot_enabled?: boolean
          pot_allocation_rule?: 'equal' | 'proportional' | 'custom'
          shared_pot_target?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['households']['Insert']>
        Relationships: []
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: string
          income: number | null
          pot_contribution: number | null
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role?: string
          income?: number | null
          pot_contribution?: number | null
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['household_members']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'categories_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'expenses_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_paid_by_fkey'
            columns: ['paid_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_personal_user_id_fkey'
            columns: ['personal_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'savings_goals'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'budgets_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'budgets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'savings_goals_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'goal_contributions_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'savings_goals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'goal_contributions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'settlements_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_owed_by_fkey'
            columns: ['owed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_owed_to_fkey'
            columns: ['owed_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          household_id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          summary: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          summary?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'audit_log_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: []
      }
      monthly_settlement: {
        Row: {
          household_id: string
          period_month: string
          owed_by: string
          owed_to: string
          amount: number
        }
        Relationships: []
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
      create_household: {
        Args: { name: string }
        Returns: Database['public']['Tables']['households']['Row']
      }
      seed_default_categories: {
        Args: { hid: string }
        Returns: void
      }
      remove_member: {
        Args: { p_household_id: string; p_member_id: string; p_keep_expenses: boolean }
        Returns: void
      }
      leave_household: {
        Args: { p_household_id: string }
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
      monthly_by_category: {
        Args: { p_household_id: string; p_month: string }
        Returns: {
          category_id: string
          category_name: string
          category_color: string
          total_amount: number
        }[]
      }
      monthly_trend: {
        Args: { p_household_id: string }
        Returns: {
          month: string
          total_amount: number
        }[]
      }
      person_contributions: {
        Args: { p_household_id: string }
        Returns: {
          month: string
          user_id: string
          display_name: string
          total_amount: number
        }[]
      }
    }
  }
}
