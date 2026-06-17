import { supabase } from '@/lib/supabase'
async function f() {
  const { error } = await supabase.from('profiles').update({ dark_mode: true }).eq('id', 'x')
  console.log(error)
}
void f
