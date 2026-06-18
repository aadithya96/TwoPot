/** Centralised, typed React Query key factory. Never construct query keys inline. */
export const queryKeys = {
  session: ['session'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  household: (userId: string) => ['household', userId] as const,
  incomeSplit: (householdId: string) => ['incomeSplit', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  expenses: (householdId: string, month: string) => ['expenses', householdId, month] as const,
  expense: (expenseId: string) => ['expense', expenseId] as const,
  recurringExpenses: (householdId: string) => ['recurringExpenses', householdId] as const,
  budgetUsage: (householdId: string) => ['budgetUsage', householdId] as const,
  goals: (householdId: string) => ['goals', householdId] as const,
  goalContributions: (goalId: string) => ['goalContributions', goalId] as const,
  settlement: (householdId: string, periodMonth: string) =>
    ['settlement', householdId, periodMonth] as const,
  settlementRecord: (householdId: string, periodMonth: string) =>
    ['settlementRecord', householdId, periodMonth] as const,
  settlementHistory: (householdId: string) => ['settlementHistory', householdId] as const,
  monthlyByCategory: (householdId: string, month: string) =>
    ['monthlyByCategory', householdId, month] as const,
  monthlyTrend: (householdId: string) => ['monthlyTrend', householdId] as const,
  personContributions: (householdId: string, month: string) =>
    ['personContributions', householdId, month] as const,
  pushSubscription: (userId: string) => ['pushSubscription', userId] as const,
}
