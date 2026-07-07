import type { Database } from './db'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseWithRelations = Expense & {
  category: Category | null
  // Null when the paying profile can no longer be read (e.g. a former member).
  payer: Profile | null
}
export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetUsage = Database['public']['Views']['budget_usage']['Row']
export type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']
export type GoalContribution = Database['public']['Tables']['goal_contributions']['Row']
export type Movie = Database['public']['Tables']['movies']['Row']
export type MovieRating = Database['public']['Tables']['movie_ratings']['Row']
/** A watchlist movie joined with both members' ratings (empty array when unrated). */
export type MovieWithRatings = Movie & {
  ratings: MovieRating[]
}
export type Task = Database['public']['Tables']['tasks']['Row']
/** Which section a task item belongs to on the tasks page. */
export type TaskKind = 'todo' | 'task' | 'buy'
export type TaskPriority = 'low' | 'medium' | 'high'
export type Settlement = Database['public']['Tables']['settlements']['Row']
export type PushSubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row']
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row']
export type AuditLogEntryWithActor = AuditLogEntry & {
  actor: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}
