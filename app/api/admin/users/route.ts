import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { 
  withAdminAuth, 
  logAdminAction,
  createErrorResponse,
  createSuccessResponse,
  isAdminOnly,
  type AdminApiUser 
} from '@/lib/api/admin-auth';
import type { UserRole, UserStatus } from '@/types/database';
import type { UserListParams } from '@/types/admin';

/**
 * GET /api/admin/users
 * List users with pagination, search, and filtering
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = createServerClient();
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const search = searchParams.get('search') || '';
      const role = searchParams.get('role') as UserRole | null;
      const status = searchParams.get('status') as UserStatus | null;
      const sortBy = searchParams.get('sortBy') || 'created_at';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Build query
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });
      
      // Apply search filter (search in email and full_name)
      if (search.trim()) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }
      
      // Apply role filter
      if (role) {
        query = query.eq('role', role);
      }
      
      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }
      
      // Apply sorting
      const validSortColumns = ['created_at', 'full_name', 'email', 'last_active_date'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute query
      const { data: users, count, error } = await query;
      
      if (error) {
        console.error('Error fetching users:', error);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch users');
      }
      
      // Calculate pagination info
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return NextResponse.json({
        success: true,
        users: users || [],
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/admin/users:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      // Only admins can create users
      if (!isAdminOnly(adminUser)) {
        return createErrorResponse(403, 'Forbidden', 'Only admins can create users');
      }
      
      const body = await req.json();
      const { email, password, full_name, role, phone, institution } = body;
      
      // Validate required fields
      if (!email || !password || !full_name) {
        return createErrorResponse(400, 'Bad Request', 'Email, password, and full_name are required');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createErrorResponse(400, 'Bad Request', 'Invalid email format');
      }
      
      // Validate password length
      if (password.length < 6) {
        return createErrorResponse(400, 'Bad Request', 'Password must be at least 6 characters');
      }
      
      // Validate role
      const validRoles: UserRole[] = ['student', 'tutor', 'admin'];
      const userRole: UserRole = validRoles.includes(role) ? role : 'student';
      
      // Create user using Supabase Admin API
      // This requires the service_role key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
        return createErrorResponse(500, 'Configuration Error', 'Admin user creation is not configured');
      }
      
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      // Check if user with email already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        return createErrorResponse(409, 'Conflict', 'A user with this email already exists');
      }
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
        },
      });
      
      if (authError) {
        console.error('Error creating auth user:', authError);
        return createErrorResponse(500, 'Auth Error', authError.message);
      }
      
      if (!authData.user) {
        return createErrorResponse(500, 'Auth Error', 'Failed to create user');
      }
      
      // Update user record with additional fields
      // The handle_new_user trigger should have created the base record
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          full_name,
          role: userRole,
          status: 'active',
          // Add optional fields if provided
          ...(phone && { phone }),
          ...(institution && { institution }),
        })
        .eq('id', authData.user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating user record:', updateError);
        // Note: User was created in auth but profile update failed
        // The user still exists, so we should log this
      }
      
      // Log the action
      await logAdminAction({
        admin_id: adminUser.id,
        action: 'CREATE',
        entity_type: 'user',
        entity_id: authData.user.id,
        details: {
          email,
          full_name,
          role: userRole,
        },
      }, req);
      
      return createSuccessResponse({
        user: updatedUser || {
          id: authData.user.id,
          email,
          full_name,
          role: userRole,
          status: 'active',
        },
        message: 'User created successfully',
      }, 201);
    } catch (error) {
      console.error('Error in POST /api/admin/users:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  }, ['admin']); // Only admins can create users
}
