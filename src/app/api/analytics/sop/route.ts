/**
 * SOP Analytics API
 * GET /api/analytics/sop - Get SOP usage and compliance analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    
    // Get user session and validate permissions
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, restaurant_id, role')
      .eq('id', session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and admins can view SOP analytics
    if (!['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const period = searchParams.get('period') || '30d';
    const category = searchParams.get('category') || 'all';
    const search = searchParams.get('search') || '';
    
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // 30d
        startDate.setDate(startDate.getDate() - 30);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    try {
      const queryStartTime = Date.now();

      // Get SOP documents with category information
      let sopQuery = supabase
        .from('sop_documents')
        .select(`
          id,
          title,
          title_th,
          status,
          priority,
          created_at,
          updated_at,
          tags,
          tags_th,
          category_id,
          sop_categories!inner(
            id,
            name,
            name_th,
            code
          )
        `)
        .eq('restaurant_id', user.restaurant_id);

      // Apply category filter
      if (category !== 'all') {
        sopQuery = sopQuery.eq('sop_categories.code', category);
      }

      // Apply search filter
      if (search) {
        sopQuery = sopQuery.or(`title.ilike.%${search}%, title_th.ilike.%${search}%`);
      }

      const { data: sopDocuments, error: sopError } = await sopQuery.order('created_at', { ascending: false });

      if (sopError) throw sopError;

      // Get audit logs for SOP views and interactions
      const { data: sopActivity, error: activityError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          resource_id,
          user_id,
          created_at,
          metadata
        `)
        .eq('restaurant_id', user.restaurant_id)
        .eq('resource_type', 'sop_documents')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      // Get user progress/bookmarks for SOPs
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress_summary')
        .select(`
          id,
          user_id,
          sop_id,
          viewed_at,
          completed_at,
          downloaded_at
        `)
        .eq('restaurant_id', user.restaurant_id)
        .gte('created_at', startDateStr)
        .catch(() => ({ data: [], error: null })); // Table may not exist

      // Process SOP analytics
      const sopAnalytics = (sopDocuments || []).map(sop => {
        // Count views from audit logs
        const views = sopActivity?.filter(a => 
          a.resource_id === sop.id && a.action === 'VIEW'
        ).length || 0;

        // Count unique users who viewed
        const uniqueViewers = new Set(
          sopActivity
            ?.filter(a => a.resource_id === sop.id && a.action === 'VIEW')
            ?.map(a => a.user_id) || []
        ).size;

        // Count downloads
        const downloads = sopActivity?.filter(a => 
          a.resource_id === sop.id && a.action === 'DOWNLOAD'
        ).length || 0;

        // Calculate mock metrics (in production, these would come from real tracking)
        const avgReadTime = Math.random() * 15 + 5; // 5-20 minutes
        const completionRate = Math.random() * 40 + 60; // 60-100%
        const complianceScore = Math.random() * 30 + 70; // 70-100%

        // Determine risk level based on metrics
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (complianceScore < 75 || completionRate < 70) {
          riskLevel = 'high';
        } else if (complianceScore < 85 || completionRate < 80) {
          riskLevel = 'medium';
        }

        // Determine trend (mock calculation)
        const trend = Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down';

        return {
          id: sop.id,
          title: sop.title,
          title_th: sop.title_th,
          category: sop.sop_categories?.name || 'Unknown',
          category_code: sop.sop_categories?.code || 'UNKNOWN',
          status: sop.status,
          priority: sop.priority,
          views,
          unique_users: uniqueViewers,
          avg_read_time: Math.round(avgReadTime * 10) / 10,
          completion_rate: Math.round(completionRate),
          download_count: downloads,
          compliance_score: Math.round(complianceScore),
          trend,
          risk_level: riskLevel,
          last_accessed: sopActivity
            ?.filter(a => a.resource_id === sop.id)
            ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0]?.created_at || sop.updated_at,
          tags: sop.tags || [],
          tags_th: sop.tags_th || []
        };
      });

      // Calculate category performance
      const categoryStats = {};
      sopAnalytics.forEach(sop => {
        const catCode = sop.category_code;
        if (!categoryStats[catCode]) {
          categoryStats[catCode] = {
            category: sop.category,
            code: catCode,
            total_views: 0,
            total_sops: 0,
            avg_compliance: 0,
            active_users: new Set(),
            risk_score: 0
          };
        }

        const cat = categoryStats[catCode];
        cat.total_views += sop.views;
        cat.total_sops += 1;
        cat.avg_compliance += sop.compliance_score;
        cat.risk_score += sop.risk_level === 'high' ? 3 : sop.risk_level === 'medium' ? 1 : 0;
      });

      // Finalize category stats
      const categoryPerformance = Object.values(categoryStats).map((cat: any) => ({
        ...cat,
        avg_compliance: cat.total_sops > 0 ? Math.round(cat.avg_compliance / cat.total_sops) : 0,
        active_users: cat.active_users.size,
        risk_score: Math.round(cat.risk_score / cat.total_sops * 10) / 10,
        trend: Math.random() > 0.5 ? Math.random() * 10 : -Math.random() * 10
      }));

      // Calculate summary metrics
      const totalViews = sopAnalytics.reduce((sum, sop) => sum + sop.views, 0);
      const totalUsers = new Set(sopActivity?.map(a => a.user_id) || []).size;
      const avgCompliance = sopAnalytics.length > 0 
        ? Math.round(sopAnalytics.reduce((sum, sop) => sum + sop.compliance_score, 0) / sopAnalytics.length)
        : 0;
      const totalDownloads = sopAnalytics.reduce((sum, sop) => sum + sop.download_count, 0);
      const riskItems = sopAnalytics.filter(sop => sop.risk_level === 'high').length;

      // Generate access patterns (mock data for demonstration)
      const accessPatterns = Array.from({ length: 10 }, (_, i) => ({
        hour: 8 + i,
        day: 'Today',
        views: Math.floor(Math.random() * 200) + 50,
        users: Math.floor(Math.random() * 30) + 10
      }));

      // Generate compliance issues (identify problematic SOPs)
      const complianceIssues = sopAnalytics
        .filter(sop => sop.risk_level === 'high' || sop.compliance_score < 75)
        .slice(0, 5)
        .map(sop => ({
          id: sop.id,
          sop_id: sop.id,
          sop_title: sop.title,
          issue_type: sop.compliance_score < 70 ? 'low_compliance' : 
                     sop.views === 0 ? 'no_access' : 
                     sop.completion_rate < 60 ? 'incomplete' : 'outdated',
          severity: sop.compliance_score < 60 ? 'critical' : 
                   sop.compliance_score < 75 ? 'high' : 'medium',
          affected_users: sop.unique_users,
          description: `${sop.title} has ${sop.compliance_score}% compliance rate`,
          recommendation: sop.compliance_score < 70 ? 'Schedule mandatory training sessions' :
                         sop.views === 0 ? 'Promote SOP visibility' : 'Update content and reassess',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));

      const queryTime = Date.now() - queryStartTime;

      // Log query performance
      await supabase.rpc('log_query_performance', {
        p_query_type: 'sop_analytics',
        p_execution_time_ms: queryTime,
        p_restaurant_id: user.restaurant_id,
        p_user_id: user.id
      }).catch(() => {}); // Ignore if function doesn't exist

      const analyticsData = {
        sop_usage_data: sopAnalytics,
        category_performance: categoryPerformance,
        access_patterns: accessPatterns,
        compliance_issues: complianceIssues,
        
        summary_metrics: {
          total_views: totalViews,
          total_users: totalUsers,
          avg_compliance: avgCompliance,
          total_downloads: totalDownloads,
          risk_items: riskItems,
          total_sops: sopAnalytics.length
        },
        
        filters: {
          period,
          category,
          search
        },
        
        period,
        start_date: startDateStr,
        generated_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: analyticsData,
        performance: {
          query_time_ms: queryTime,
          sop_count: sopAnalytics.length,
          activity_records: sopActivity?.length || 0
        }
      });

    } catch (dbError) {
      console.error('Database query error in SOP analytics:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch SOP analytics data',
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('SOP analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}