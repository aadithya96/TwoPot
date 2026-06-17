import { supabase } from '@/lib/supabase'

interface MonthlyByCategoryRow {
  category_id: string
  category_name: string
  category_color: string
  total_amount: number
}

async function f() {
  const client = supabase as unknown as {
    rpc: (
      fn: 'monthly_by_category',
      args: { p_household_id: string; p_month: string }
    ) => Promise<{ data: MonthlyByCategoryRow[] | null; error: { message: string } | null }>
  }
  const { data, error } = await client.rpc('monthly_by_category', { p_household_id: 'x', p_month: 'y' })
  console.log(data, error)
}
void f
