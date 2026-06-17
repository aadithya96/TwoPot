import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { LoginPage } from '@/features/auth/LoginPage'

const OnboardingFlow = lazy(() =>
  import('@/features/auth/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow }))
)
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const ExpensesPage = lazy(() =>
  import('@/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage }))
)
const BudgetsPage = lazy(() =>
  import('@/pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage }))
)
const GoalsPage = lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const InsightsPage = lazy(() =>
  import('@/pages/InsightsPage').then((m) => ({ default: m.InsightsPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
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
      { path: 'insights', element: <InsightsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
