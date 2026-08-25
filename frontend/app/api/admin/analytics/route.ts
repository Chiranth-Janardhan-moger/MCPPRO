import { requireAdmin } from '@/lib/auth/admin';
import supabaseAdmin from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = supabaseAdmin();

    // Fetch requests from mcppro_requests
    const { data: requests, error: reqError } = await supabase
      .from('mcppro_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (reqError) {
      console.warn('[admin/analytics] Notice querying mcppro_requests:', reqError.message);
    }

    // Fetch documents counts
    const { data: docs } = await supabase
      .from('user_documents')
      .select('id, is_global, file_size, chunk_count');

    const allRequests = requests || [];
    const allDocs = docs || [];

    const totalRequests = allRequests.length;
    const successfulRequests = allRequests.filter((r) => r.success !== false).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;

    // Calculate unique users
    const uniqueUserSet = new Set<string>();
    allRequests.forEach((r) => {
      if (r.user_email) uniqueUserSet.add(r.user_email);
      else if (r.user_id) uniqueUserSet.add(r.user_id);
    });
    const uniqueUsersCount = Math.max(uniqueUserSet.size, totalRequests > 0 ? 1 : 0);

    // Calculate average latency
    const totalLatency = allRequests.reduce((acc, r) => acc + (Number(r.processing_time) || 0), 0);
    const avgProcessingTime = totalRequests > 0 ? (totalLatency / totalRequests).toFixed(2) : '0.00';

    // Route breakdown
    const routeCounts = {
      RAG: 0,
      ONLINE: 0,
      DIRECT: 0,
    };

    allRequests.forEach((r) => {
      const rawRoute = (r.route || '').toUpperCase();
      if (rawRoute === 'RAG') routeCounts.RAG++;
      else if (rawRoute === 'ONLINE') routeCounts.ONLINE++;
      else routeCounts.DIRECT++;
    });

    // Model breakdown
    const modelMap: Record<string, number> = {};
    allRequests.forEach((r) => {
      const m = r.model || 'gemini-3.6-flash';
      modelMap[m] = (modelMap[m] || 0) + 1;
    });

    const modelUsage = Object.entries(modelMap).map(([model, count]) => ({
      model,
      count,
      percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
    }));

    // Group timeseries by date (last 14 days)
    const dailyMap: Record<string, { date: string; total: number; success: number; rag: number; online: number; direct: number }> = {};

    // Seed last 7 days so chart is never empty
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { date: dateStr, total: 0, success: 0, rag: 0, online: 0, direct: 0 };
    }

    allRequests.forEach((r) => {
      const dateStr = (r.timestamp || r.created_at || new Date().toISOString()).split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, total: 0, success: 0, rag: 0, online: 0, direct: 0 };
      }
      dailyMap[dateStr].total++;
      if (r.success !== false) dailyMap[dateStr].success++;
      const route = (r.route || 'DIRECT').toUpperCase();
      if (route === 'RAG') dailyMap[dateStr].rag++;
      else if (route === 'ONLINE') dailyMap[dateStr].online++;
      else dailyMap[dateStr].direct++;
    });

    const timeseries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Active Users ranking
    const userActivityMap: Record<string, { email: string; requests: number; lastActive: string }> = {};
    allRequests.forEach((r) => {
      const email = r.user_email || (r.user_id ? `user-${r.user_id.slice(0, 6)}` : 'Anonymous User');
      const time = r.timestamp || r.created_at || new Date().toISOString();

      if (!userActivityMap[email]) {
        userActivityMap[email] = { email, requests: 0, lastActive: time };
      }
      userActivityMap[email].requests++;
      if (time > userActivityMap[email].lastActive) {
        userActivityMap[email].lastActive = time;
      }
    });

    const activeUsers = Object.values(userActivityMap).sort((a, b) => b.requests - a.requests);

    // Global and user docs
    const totalGlobalDocs = allDocs.filter((d) => d.is_global).length;
    const totalUserDocs = allDocs.filter((d) => !d.is_global).length;
    const totalChunksIndexed = allDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

    return Response.json({
      success: true,
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        uniqueUsers: uniqueUsersCount,
        avgProcessingTime: Number(avgProcessingTime),
        totalGlobalDocs,
        totalUserDocs,
        totalChunksIndexed,
        routeCounts,
      },
      timeseries,
      modelUsage,
      activeUsers,
      recentLogs: allRequests.slice(0, 50).map((r) => ({
        id: r.id,
        timestamp: r.timestamp || r.created_at,
        query: Array.isArray(r.questions) ? r.questions[0] : (r.document_url || 'Chat query'),
        answer: Array.isArray(r.answers) ? r.answers[0] : (typeof r.answers === 'string' ? r.answers : ''),
        processingTime: Number(r.processing_time) || 0,
        model: r.model || 'gemini-3.6-flash',
        route: (r.route || 'DIRECT').toUpperCase(),
        routerConfidence: r.router_confidence ?? 1.0,
        routerReasoning: r.router_reasoning || '',
        userEmail: r.user_email || 'Anonymous',
        success: r.success !== false,
        errorMessage: r.error_message,
        documentMetadata: r.document_metadata,
      })),
    });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}
