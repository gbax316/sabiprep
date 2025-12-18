import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import {
  withAdminAuth,
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser,
} from '@/lib/api/admin-auth';
import type { AuditLogListParams, PaginatedResponse } from '@/types/admin';
import type { AdminAuditLog } from '@/types/database';

/**
 * GET /api/admin/audit
 * Fetch audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser, req: NextRequest) => {
    try {
      const supabase = await createServerClient();
      const { searchParams } = new URL(req.url);

      // Parse query parameters
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
      const offset = (page - 1) * limit;

      const adminId = searchParams.get('admin_id') || undefined;
      const action = searchParams.get('action') || undefined;
      const entityType = searchParams.get('entity_type') || undefined;
      const startDate = searchParams.get('start_date') || undefined;
      const endDate = searchParams.get('end_date') || undefined;

      // Build query
      let query = supabase
        .from('admin_audit_logs')
        .select(`
          *,
          users!admin_id(
            id,
            full_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (adminId) {
        query = query.eq('admin_id', adminId);
      }

      if (action) {
        query = query.eq('action', action);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return createErrorResponse(500, 'Database Error', 'Failed to fetch audit logs');
      }

      // Transform data to include admin info
      const auditLogs: (AdminAuditLog & { admin?: { full_name: string; email: string } })[] =
        (data || []).map((log: any) => ({
          id: log.id,
          admin_id: log.admin_id,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          details: log.details,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          created_at: log.created_at,
          admin: log.users && Array.isArray(log.users) && log.users.length > 0
            ? {
                full_name: log.users[0].full_name,
                email: log.users[0].email,
              }
            : log.users && !Array.isArray(log.users)
            ? {
                full_name: log.users.full_name,
                email: log.users.email,
              }
            : undefined,
        }));

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      const pagination: PaginatedResponse<AdminAuditLog>['pagination'] = {
        total,
        page,
        limit,
        totalPages,
      };

      return createSuccessResponse({
        logs: auditLogs,
        pagination,
      });
    } catch (error) {
      console.error('Error in GET /api/admin/audit:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}
