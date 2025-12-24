import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { withAdminAuth, createSuccessResponse, createErrorResponse } from '@/lib/api/admin-auth';
import type { AdminApiUser } from '@/lib/api/admin-auth';
import type { AdminDashboardStats, ActivityFeedEntry } from '@/types/admin';
import type { UserRole, ImportReport, User } from '@/types/database';

/**
 * Dashboard Stats API Response
 */
interface DashboardStatsResponse {
  stats: AdminDashboardStats;
  recentImports: Array<{
    id: string;
    filename: string;
    status: string;
    total_rows: number;
    successful_rows: number;
    created_at: string;
  }>;
  recentUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    created_at: string;
  }>;
}

/**
 * GET /api/admin/dashboard
 * Returns dashboard statistics including users, questions, and activity
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withAdminAuth(request, async (user: AdminApiUser) => {
    try {
      const supabase = await createServerClient();
      
      // Get current date info for calculations
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Fetch all data in parallel with optimized queries
      const [
        usersCountResult,
        usersByRoleResult,
        activeUsersResult,
        newUsersResult,
        questionsCountResult,
        publishedQuestionsResult,
        draftQuestionsResult,
        subjectsResult,
        topicsResult,
        sessionsResult,
        recentImportsResult,
        recentUsersResult,
      ] = await Promise.all([
        // Total users count
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true }),
        
        // Users by role - use count queries for efficiency
        Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'tutor'),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        ]),
        
        // Active users (last 7 days) - limit to reasonable number
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gte('last_active_date', sevenDaysAgo.toISOString()),
        
        // New users this month
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString()),
        
        // Total questions count
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true }),
        
        // Published questions count
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published'),
        
        // Draft questions count
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        
        // Subjects count
        supabase
          .from('subjects')
          .select('id', { count: 'exact', head: true }),
        
        // Topics count
        supabase
          .from('topics')
          .select('id', { count: 'exact', head: true }),
        
        // Sessions data for activity - limit to recent sessions for performance
        supabase
          .from('sessions')
          .select('id, questions_answered, correct_answers, started_at')
          .order('started_at', { ascending: false })
          .limit(1000), // Limit to last 1000 sessions for performance
        
        // Recent imports (last 10)
        supabase
          .from('import_reports')
          .select('id, filename, status, total_rows, successful_rows, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Recent user registrations (last 10)
        supabase
          .from('users')
          .select('id, full_name, email, role, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      
      // Process users data from count queries
      const usersByRole: Record<UserRole, number> = {
        student: usersByRoleResult[0].count || 0,
        tutor: usersByRoleResult[1].count || 0,
        admin: usersByRoleResult[2].count || 0,
      };
      
      const activeUsersCount = activeUsersResult.count || 0;
      const newThisMonthCount = newUsersResult.count || 0;
      
      // Process questions data from count queries
      const publishedCount = publishedQuestionsResult.count || 0;
      const draftCount = draftQuestionsResult.count || 0;
      
      // Process sessions data
      const sessions = sessionsResult.data || [];
      let totalAnswered = 0;
      let totalCorrect = 0;
      let sessionsTodayCount = 0;
      
      sessions.forEach((s) => {
        totalAnswered += s.questions_answered || 0;
        totalCorrect += s.correct_answers || 0;
        
        if (s.started_at) {
          const startedAt = new Date(s.started_at);
          if (startedAt >= startOfToday) {
            sessionsTodayCount++;
          }
        }
      });
      
      const averageAccuracy = totalAnswered > 0 
        ? Math.round((totalCorrect / totalAnswered) * 100) 
        : 0;
      
      // Build response
      const stats: AdminDashboardStats = {
        users: {
          total: usersCountResult.count || 0,
          active: activeUsersCount,
          newThisMonth: newThisMonthCount,
          byRole: usersByRole,
        },
        content: {
          totalSubjects: subjectsResult.count || 0,
          totalTopics: topicsResult.count || 0,
          totalQuestions: questionsCountResult.count || 0,
          publishedQuestions: publishedCount,
          draftQuestions: draftCount,
        },
        activity: {
          totalSessions: sessions.length,
          totalAnswered,
          averageAccuracy,
          sessionsToday: sessionsTodayCount,
        },
      };
      
      const response: DashboardStatsResponse = {
        stats,
        recentImports: (recentImportsResult.data as Array<{
          id: string;
          filename: string;
          status: string;
          total_rows: number;
          successful_rows: number;
          created_at: string;
        }>) || [],
        recentUsers: (recentUsersResult.data as Array<{
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          created_at: string;
        }>) || [],
      };
      
      return createSuccessResponse(response);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return createErrorResponse(500, 'Internal Server Error', 'Failed to fetch dashboard statistics');
    }
  });
}
