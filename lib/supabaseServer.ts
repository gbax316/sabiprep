import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side operations with proper cookie handling.
 *
 * This client properly manages authentication sessions by reading and writing cookies,
 * which is essential for API routes that require authentication.
 *
 * @example
 * ```typescript
 * // In an API route
 * import { createServerClient } from '@/lib/supabaseServer'
 *
 * export async function GET() {
 *   const supabase = createServerClient()
 *   const { data: { session } } = await supabase.auth.getSession()
 *   // Session will be properly retrieved from cookies
 * }
 * ```
 */
export function createServerClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  console.log('[DEBUG] Creating server client with cookie handling')
  
  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const allCookies = cookieStore.getAll()
        console.log('[DEBUG] Getting cookies:', allCookies.length, 'cookies found')
        return allCookies
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            console.log('[DEBUG] Setting cookie:', name)
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          console.error('[DEBUG] Error setting cookies:', error)
          // Ignore errors in middleware/server components where cookies are read-only
        }
      },
    },
  })
}
