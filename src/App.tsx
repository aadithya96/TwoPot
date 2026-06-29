import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { LoginPage } from '@/features/auth/LoginPage'
import { lazyWithRetry } from '@/lib/lazyWithRetry'

const OnboardingFlow = lazyWithRetry(() =>
  import('@/features/auth/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow }))
)
const HomePage = lazyWithRetry(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage }))
)
const ExpensesPage = lazyWithRetry(() =>
  import('@/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage }))
)
const BudgetsPage = lazyWithRetry(() =>
  import('@/pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage }))
)
const GoalsPage = lazyWithRetry(() =>
  import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage }))
)
const MoviesPage = lazyWithRetry(() =>
  import('@/pages/MoviesPage').then((m) => ({ default: m.MoviesPage }))
)
const InsightsPage = lazyWithRetry(() =>
  import('@/pages/InsightsPage').then((m) => ({ default: m.InsightsPage }))
)
const SettingsPage = lazyWithRetry(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const NotificationsPage = lazyWithRetry(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
)
const HouseholdPage = lazyWithRetry(() =>
  import('@/pages/HouseholdPage').then((m) => ({ default: m.HouseholdPage }))
)
const AuditLogPage = lazyWithRetry(() =>
  import('@/features/household').then((m) => ({ default: m.AuditLogPage }))
)

/** App route tree. `/login` is eagerly loaded; everything else is lazy. */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/onboarding', element: <OnboardingFlow /> },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'movies', element: <MoviesPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/notifications', element: <NotificationsPage /> },
      { path: 'settings/household', element: <HouseholdPage /> },
      { path: 'settings/activity', element: <AuditLogPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
