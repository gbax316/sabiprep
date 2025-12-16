import { createServerClient } from '@/lib/supabaseServer'

/**
 * Server Component Example
 * 
 * This page demonstrates server-side data fetching with Supabase.
 * The data is fetched on the server during rendering, making it:
 * - SEO friendly (data available in initial HTML)
 * - Fast (no client-side loading state)
 * - Efficient (no additional client bundle)
 */
export default async function ServerExample() {
  const supabase = createServerClient()
  const { data: todos, error } = await supabase.from('todos').select('*')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error.message}</p>
          <p className="text-sm text-gray-500 mt-4">
            Make sure you've:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
            <li>Created a 'todos' table in Supabase</li>
            <li>Set up environment variables in .env.local</li>
            <li>Enabled Row Level Security (RLS) policies</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">
              🚀 Server Component Example
            </h1>
            <p className="text-blue-100 mt-2">
              Data fetched on the server during rendering
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ Benefits</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• SEO friendly</li>
                  <li>• No loading state</li>
                  <li>• Smaller client bundle</li>
                  <li>• Server-side rendering</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Info</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Component: Server</li>
                  <li>• Client: supabaseServer</li>
                  <li>• Rendering: SSR</li>
                  <li>• Table: todos</li>
                </ul>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Todos Data
                </h2>
                <span className="text-sm text-gray-500">
                  {todos?.length || 0} {todos?.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              {!todos || todos.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-800 font-medium mb-2">
                    No todos found
                  </p>
                  <p className="text-sm text-yellow-700">
                    Your todos table is empty. Add some data in Supabase to see it here!
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(todos, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Compare with Client Component:
              </h3>
              <a 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Client Component Example →
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            📝 Implementation Code
          </h2>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm"><code>{`// app/server-example/page.tsx
import { createServerClient } from '@/lib/supabaseServer'

export default async function ServerExample() {
  const supabase = createServerClient()
  const { data } = await supabase.from('todos').select('*')
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}`}</code></pre>
          </div>
        </div>
      </div>
    </main>
  )
}
