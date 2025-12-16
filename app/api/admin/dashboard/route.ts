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
      const supabase = createServerClient();
      
      // Get current date info for calculations
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Fetch all data in parallel
      const [
        usersResult,
        questionsResult,
        subjectsResult,
        topicsResult,
        sessionsResult,
        recentImportsResult,
        recentUsersResult,
      ] = await Promise.all([
        // Users data - get all to calculate breakdowns
        supabase
          .from('users')
          .select('id, role, status, last_active_date, created_at'),
        
        // Questions data - get all to calculate breakdowns
        supabase
          .from('questions')
          .select('id, status'),
        
        // Subjects count
        supabase
          .from('subjects')
          .select('id', { count: 'exact', head: true }),
        
        // Topics count
        supabase
          .from('topics')
          .select('id', { count: 'exact', head: true }),
        
        // Sessions data for activity
        supabase
          .from('sessions')
          .select('id, questions_answered, correct_answers, started_at'),
        
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
      
      // Process users data
      const users = usersResult.data || [];
      const usersByRole: Record<UserRole, number> = {
        student: 0,
        tutor: 0,
        admin: 0,
      };
      
      let activeUsersCount = 0;
      let newThisMonthCount = 0;
      
      users.forEach((u) => {
        // Count by role
        if (u.role && usersByRole[u.role as UserRole] !== undefined) {
          usersByRole[u.role as UserRole]++;
        }
        
        // Count active users (active in last 7 days)
        if (u.last_active_date) {
          const lastActive = new Date(u.last_active_date);
          if (lastActive >= sevenDaysAgo) {
            activeUsersCount++;
          }
        }
        
        // Count new users this month
        if (u.created_at) {
          const createdAt = new Date(u.created_at);
          if (createdAt >= startOfMonth) {
            newThisMonthCount++;
          }
        }
      });
      
      // Process questions data
      const questions = questionsResult.data || [];
      let publishedCount = 0;
      let draftCount = 0;
      
      questions.forEach((q) => {
        if (q.status === 'published') {
          publishedCount++;
        } else if (q.status === 'draft') {
          draftCount++;
        }
      });
      
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
          total: users.length,
          active: activeUsersCount,
          newThisMonth: newThisMonthCount,
          byRole: usersByRole,
        },
        content: {
          totalSubjects: subjectsResult.count || 0,
          totalTopics: topicsResult.count || 0,
          totalQuestions: questions.length,
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
