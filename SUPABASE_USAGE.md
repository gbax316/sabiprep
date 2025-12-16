# Supabase Usage Guide

Complete guide for using Supabase in your Next.js application with both client and server components.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [Client Components](#client-components)
- [Server Components](#server-components)
- [When to Use Which](#when-to-use-which)
- [Security](#security)
- [Production Auth](#production-auth)
- [Examples](#examples)

---

## Overview

This project uses two different Supabase client patterns:

| Pattern | File | Use Case |
|---------|------|----------|
| **Browser Client** | [`lib/supabaseClient.ts`](lib/supabaseClient.ts) | Client Components (interactive) |
| **Server Client** | [`lib/supabaseServer.ts`](lib/supabaseServer.ts) | Server Components (SSR/SSG) |

Both clients use the same Supabase project and rely on **Row Level Security (RLS)** for data protection.

---

## Setup

### 1. Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** > **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Install Dependencies

The required packages should already be installed:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 3. Set Up Database

Create a simple todos table in Supabase:

```sql
-- Create table
CREATE TABLE todos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policy (allows all operations for testing)
CREATE POLICY "Allow all operations" ON todos
FOR ALL USING (true) WITH CHECK (true);
```

> ⚠️ **Note**: For production, replace the permissive policy above with proper user-based policies.

---

## Client Components

### When to Use
- ✅ User interactions (clicks, form submissions)
- ✅ Real-time updates
- ✅ Client-side state management
- ✅ Immediate UI feedback
- ✅ Interactive features

### Usage

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Todo = { id: number; title: string; completed: boolean }

export default function ClientTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch data
  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setTodos(data)
    setLoading(false)
  }

  // Add todo
  async function addTodo(title: string) {
    const { data, error } = await supabase
      .from('todos')
      .insert([{ title }])
      .select()
    
    if (data) setTodos([...todos, ...data])
  }

  // Delete todo
  async function deleteTodo(id: number) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(todos.filter(t => t.id !== id))
  }

  // Toggle completion
  async function toggleTodo(id: number, completed: boolean) {
    await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)
    
    setTodos(todos.map(t => 
      t.id === id ? { ...t, completed } : t
    ))
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Todos</h1>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={(e) => toggleTodo(todo.id, e.target.checked)}
            />
            {todo.title}
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={() => addTodo('New Todo')}>Add Todo</button>
    </div>
  )
}
```

### Real-time Subscriptions

```typescript
useEffect(() => {
  // Subscribe to changes
  const channel = supabase
    .channel('todos-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        console.log('Change received!', payload)
        fetchTodos() // Refresh data
      }
    )
    .subscribe()

  // Cleanup
  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

---

## Server Components

### When to Use
- ✅ Initial page loads
- ✅ SEO-critical pages
- ✅ Static/cached content
- ✅ Public data display
- ✅ Reducing client bundle size

### Usage

```typescript
import { createServerClient } from '@/lib/supabaseServer'

export default async function ServerTodos() {
  const supabase = createServerClient()
  const { data: todos, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div>
      <h1>Todos ({todos.length})</h1>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### With Error Handling

```typescript
import { createServerClient } from '@/lib/supabaseServer'

export default async function Page() {
  const supabase = createServerClient()
  
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
    
    if (error) throw error

    return <div>{/* Render data */}</div>
  } catch (error) {
    console.error('Database error:', error)
    return <div>Failed to load data</div>
  }
}
```

---

## When to Use Which

### Decision Matrix

```
Need user interaction? ───────────────► Client Component
Need real-time updates? ──────────────► Client Component
Need SEO? ────────────────────────────► Server Component
Public data only? ────────────────────► Server Component
Initial page load? ───────────────────► Server Component
Form submission? ─────────────────────► Client Component
Static content? ──────────────────────► Server Component
Reducing bundle size? ────────────────► Server Component
```

### Common Patterns

#### Pattern 1: Server + Client Hybrid

```typescript
// app/todos/page.tsx (Server Component)
import { createServerClient } from '@/lib/supabaseServer'
import TodoList from './TodoList'

export default async function TodosPage() {
  const supabase = createServerClient()
  const { data } = await supabase.from('todos').select('*')

  // Pass server data to client component
  return <TodoList initialTodos={data || []} />
}
```

```typescript
// app/todos/TodoList.tsx (Client Component)
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TodoList({ initialTodos }) {
  const [todos, setTodos] = useState(initialTodos)
  
  // Client-side mutations
  async function addTodo(title: string) {
    const { data } = await supabase
      .from('todos')
      .insert([{ title }])
      .select()
    if (data) setTodos([...todos, ...data])
  }

  return (
    <div>
      {/* Interactive UI */}
    </div>
  )
}
```

#### Pattern 2: Server Actions (Next.js 14+)

```typescript
// app/actions/todos.ts
'use server'

import { createServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

export async function addTodo(formData: FormData) {
  const title = formData.get('title') as string
  const supabase = createServerClient()
  
  await supabase.from('todos').insert([{ title }])
  revalidatePath('/todos')
}
```

```typescript
// app/todos/page.tsx
import { addTodo } from '../actions/todos'

export default async function Page() {
  return (
    <form action={addTodo}>
      <input name="title" />
      <button type="submit">Add</button>
    </form>
  )
}
```

---

## Security

### Row Level Security (RLS)

**Always enable RLS on your tables:**

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
```

### Example Policies

#### Public Read, Authenticated Write

```sql
-- Anyone can read
CREATE POLICY "Public todos are viewable by everyone"
ON todos FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can create todos"
ON todos FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
```

#### User-Specific Data

```sql
-- Add user_id column
ALTER TABLE todos ADD COLUMN user_id UUID REFERENCES auth.users;

-- Users can only see their own todos
CREATE POLICY "Users can view their own todos"
ON todos FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own todos
CREATE POLICY "Users can create their own todos"
ON todos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own todos
CREATE POLICY "Users can update their own todos"
ON todos FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own todos
CREATE POLICY "Users can delete their own todos"
ON todos FOR DELETE
USING (auth.uid() = user_id);
```

### Security Best Practices

1. ✅ **Always enable RLS** on all tables
2. ✅ **Test your RLS policies** thoroughly
3. ✅ **Use anon key** for client-side code (safe with RLS)
4. ✅ **Never expose service_role key** in client code
5. ✅ **Validate user input** on both client and server
6. ✅ **Use TypeScript** for type safety

---

## Production Auth

For production applications with authentication, upgrade the server client to handle cookies:

### Updated Server Client

```typescript
// lib/supabaseServer.ts (production version)
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()
  
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // Handle cookie setting in middleware/server components
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.delete(name)
          } catch (error) {
            // Handle cookie removal in middleware/server components
          }
        },
      },
    }
  )
}
```

### Middleware for Auth

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Examples

### Example 1: Blog Posts (Server Component)

```typescript
// app/blog/page.tsx
import { createServerClient } from '@/lib/supabaseServer'

export default async function BlogPage() {
  const supabase = createServerClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>Blog Posts</h1>
      {posts?.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  )
}
```

### Example 2: Interactive Dashboard (Client Component)

```typescript
// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .single()
      setStats(data)
    }

    fetchStats()

    // Real-time updates
    const channel = supabase
      .channel('stats-changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'user_stats' },
        (payload) => setStats(payload.new)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>
      {stats && (
        <div>
          <p>Total: {stats.total}</p>
          <p>Active: {stats.active}</p>
        </div>
      )}
    </div>
  )
}
```

### Example 3: Hybrid Pattern

```typescript
// app/products/page.tsx (Server)
import { createServerClient } from '@/lib/supabaseServer'
import ProductList from './ProductList'

export default async function ProductsPage() {
  const supabase = createServerClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('in_stock', true)

  return <ProductList initialProducts={products || []} />
}
```

```typescript
// app/products/ProductList.tsx (Client)
'use client'

import { useState } from 'react'

export default function ProductList({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts)
  const [filter, setFilter] = useState('')

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <input 
        placeholder="Filter products..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {filtered.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

---

## Live Examples

Visit these pages to see both patterns in action:

- **Client Component**: [`/`](/) - Interactive todos with real-time updates
- **Server Component**: [`/server-example`](/server-example) - Server-rendered todos

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@supabase/ssr'"

```bash
npm install @supabase/ssr @supabase/supabase-js
```

#### 2. Environment variables not working

- Ensure `.env.local` exists in project root
- Restart dev server after adding variables
- Check variables start with `NEXT_PUBLIC_`

#### 3. Database connection errors

- Verify Supabase URL and key are correct
- Check Supabase project is active
- Ensure table exists in database

#### 4. RLS policies blocking queries

```sql
-- Temporarily allow all (for debugging only)
CREATE POLICY "Allow all for testing" ON your_table
FOR ALL USING (true) WITH CHECK (true);
```

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## Questions?

For detailed implementation planning, see [`SUPABASE_IMPLEMENTATION_PLAN.md`](SUPABASE_IMPLEMENTATION_PLAN.md)
