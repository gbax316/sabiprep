import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client for server-side operations.
 * 
 * This is a simple pattern suitable for basic server-side data fetching
 * in Server Components. It uses the public anon key which is safe when
 * Row Level Security (RLS) is properly configured.
 * 
 * For production apps with authentication, consider upgrading to
 * @supabase/ssr with cookie handling for proper session management.
 * 
 * @example
 * ```typescript
 * // In a Server Component
 * import { createServerClient } from '@/lib/supabaseServer'
 * 
 * export default async function Page() {
 *   const supabase = createServerClient()
 *   const { data } = await supabase.from('todos').select('*')
 *   return <pre>{JSON.stringify(data, null, 2)}</pre>
 * }
 * ```
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseAnonKey)
}
