// Daily Reminders Cron Job
// This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
// Schedule: Run daily at 8:00 AM UTC (or your preferred time)

import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/api';
import { createServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Verify the cron secret. Vercel sends `Authorization: Bearer $CRON_SECRET`
  // on scheduled invocations. Read at request time, not module scope, so the
  // value is picked up per invocation rather than frozen at cold start.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServerClient();
    
    // Get all active users who haven't received a reminder today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // Get users who haven't practiced today
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('status', 'active')
      .eq('role', 'student');

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users to notify', count: 0 });
    }

    let notifiedCount = 0;
    const errors: string[] = [];

    // Check each user's recent activity
    for (const user of users) {
      try {
        // Check if user has completed a session today
        const { data: todaySessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', todayStart)
          .limit(1);

        // If user already practiced today, skip
        if (todaySessions && todaySessions.length > 0) {
          continue;
        }

        // Check if user already received a reminder today
        const { data: todayReminders } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'daily_reminder')
          .gte('created_at', todayStart)
          .limit(1);

        // If already reminded today, skip
        if (todayReminders && todayReminders.length > 0) {
          continue;
        }

        // Create daily reminder notification
        await createNotification(
          user.id,
          'daily_reminder',
          '📚 Time to Practice!',
          "Don't forget to practice today! Even 10 minutes can make a difference.",
          {}
        );

        notifiedCount++;
      } catch (error) {
        errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: 'Daily reminders sent',
      notified: notifiedCount,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending daily reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send daily reminders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}
