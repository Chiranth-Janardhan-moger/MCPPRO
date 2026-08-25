'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  Users,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Globe,
  Zap,
  Filter,
  Eye,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    uniqueUsers: number;
    avgProcessingTime: number;
    totalGlobalDocs: number;
    totalUserDocs: number;
    totalChunksIndexed: number;
    routeCounts: {
      RAG: number;
      ONLINE: number;
      DIRECT: number;
    };
  };
  timeseries: {
    date: string;
    total: number;
    success: number;
    rag: number;
    online: number;
    direct: number;
  }[];
  modelUsage: {
    model: string;
    count: number;
    percentage: number;
  }[];
  activeUsers: {
    email: string;
    requests: number;
    lastActive: string;
  }[];
  recentLogs: {
    id: string;
    timestamp: string;
    query: string;
    answer: string;
    processingTime: number;
    model: string;
    route: 'RAG' | 'ONLINE' | 'DIRECT';
    routerConfidence: number;
    routerReasoning: string;
    userEmail: string;
    success: boolean;
    errorMessage?: string;
    documentMetadata?: any;
  }[];
}

interface AnalyticsTabProps {
  data: AnalyticsData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const ROUTE_COLORS: Record<string, string> = {
  RAG: '#a855f7', // purple
  ONLINE: '#06b6d4', // cyan
  DIRECT: '#10b981', // emerald
};

export function AnalyticsTab({ data, isLoading, onRefresh }: AnalyticsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState<'ALL' | 'RAG' | 'ONLINE' | 'DIRECT'>('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading system analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    successRate: 100,
    uniqueUsers: 0,
    avgProcessingTime: 0,
    totalGlobalDocs: 0,
    totalUserDocs: 0,
    totalChunksIndexed: 0,
    routeCounts: { RAG: 0, ONLINE: 0, DIRECT: 0 },
  };

  const routeChartData = [
    { name: 'System RAG', value: summary.routeCounts.RAG || 0, color: ROUTE_COLORS.RAG },
    { name: 'Web Search', value: summary.routeCounts.ONLINE || 0, color: ROUTE_COLORS.ONLINE },
    { name: 'Direct LLM', value: summary.routeCounts.DIRECT || 0, color: ROUTE_COLORS.DIRECT },
  ].filter((d) => d.value > 0 || summary.totalRequests === 0);

  const filteredLogs = (data?.recentLogs || []).filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRoute = routeFilter === 'ALL' || log.route === routeFilter;
    return matchesSearch && matchesRoute;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Performance & Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Real-time usage insights, context routing distribution, and telemetry.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Requests */}
        <Card className="bg-card/50 backdrop-blur-sm border-blue-100/60 dark:border-blue-900/30">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium flex items-center justify-between">
              Total Queries
              <Activity className="h-3.5 w-3.5 text-blue-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tracking-tight">{summary.totalRequests}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {summary.successfulRequests} successful
            </p>
          </CardContent>
        </Card>

        {/* Unique Users */}
        <Card className="bg-card/50 backdrop-blur-sm border-sky-100/60 dark:border-sky-900/30">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium flex items-center justify-between">
              Total Users
              <Users className="h-3.5 w-3.5 text-sky-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
              {summary.uniqueUsers}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active accounts</p>
          </CardContent>
        </Card>

        {/* Global Documents */}
        <Card className="bg-card/50 backdrop-blur-sm border-purple-100/60 dark:border-purple-900/30">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium flex items-center justify-between">
              Fixed RAG Docs
              <Database className="h-3.5 w-3.5 text-purple-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {summary.totalGlobalDocs}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {summary.totalChunksIndexed} chunks indexed
            </p>
          </CardContent>
        </Card>

        {/* Avg Latency */}
        <Card className="bg-card/50 backdrop-blur-sm border-amber-100/60 dark:border-amber-900/30">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium flex items-center justify-between">
              Avg Latency
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {summary.avgProcessingTime}s
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">End-to-end response</p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-card/50 backdrop-blur-sm border-emerald-100/60 dark:border-emerald-900/30">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium flex items-center justify-between">
              Success Rate
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.successRate}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {summary.failedRequests} errors
            </p>
          </CardContent>
        </Card>

        {/* Context Router Ratio */}
        <Card className="bg-card/50 backdrop-blur-sm border-cyan-100/60 dark:border-cyan-900/30">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium flex items-center justify-between">
              RAG / Web
              <Globe className="h-3.5 w-3.5 text-cyan-500" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">
              {summary.routeCounts.RAG + summary.routeCounts.ONLINE}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Augmented queries</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Activity Trend Line / Area Chart */}
        <Card className="lg:col-span-8 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Query Activity & Route Trends
            </CardTitle>
            <CardDescription className="text-xs">
              Daily query volume breakdown across RAG, Web Search, and Direct execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.timeseries || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 23, 23, 0.9)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Queries"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="rag"
                    name="RAG Queries"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#colorRag)"
                  />
                  <Area
                    type="monotone"
                    dataKey="online"
                    name="Web Searches"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorOnline)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Route Distribution Donut Chart */}
        <Card className="lg:col-span-4 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              Context-Aware Routing Split
            </CardTitle>
            <CardDescription className="text-xs">
              Classification distribution by the router.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col items-center justify-center">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={routeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {routeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 23, 23, 0.9)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    formatter={(value) => <span className="text-[10px]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Breakdown & Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Model Usage Bar Chart */}
        <Card className="lg:col-span-6 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              Model Usage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.modelUsage || []}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="model" type="category" tick={{ fontSize: 10 }} width={80} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 23, 23, 0.9)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Users Table */}
        <Card className="lg:col-span-6 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-500" />
              Active Users Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
              {(data?.activeUsers || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No active user records logged yet.
                </p>
              ) : (
                data?.activeUsers.map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-blue-600 text-[10px]">
                        {idx + 1}
                      </div>
                      <span className="truncate font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {user.requests} queries
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(user.lastActive).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Request Logs & Inspector */}
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Live Request Stream & Query Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect raw questions, answers, router decisions, latency, and status.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Route Filter */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
                {(['ALL', 'RAG', 'ONLINE', 'DIRECT'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRouteFilter(r)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      routeFilter === r
                        ? 'bg-background shadow-xs text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-40 sm:w-52">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] bg-muted/30">
                  <TableHead className="w-[110px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead className="w-[100px]">Route</TableHead>
                  <TableHead className="w-[120px]">Model</TableHead>
                  <TableHead className="w-[70px]">Latency</TableHead>
                  <TableHead className="w-[70px]">Status</TableHead>
                  <TableHead className="w-[60px] text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      No matching request logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="text-xs hover:bg-muted/40">
                      <TableCell className="text-[10px] text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[120px]">
                        {log.userEmail}
                      </TableCell>
                      <TableCell className="truncate max-w-[240px] font-mono text-[11px]">
                        {log.query}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-medium ${
                            log.route === 'RAG'
                              ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                              : log.route === 'ONLINE'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {log.route}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                        {log.model}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono">
                        {log.processingTime ? `${log.processingTime.toFixed(1)}s` : '-'}
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Request Inspector</span>
                <Badge variant={selectedLog.success ? 'default' : 'destructive'} className="text-[10px]">
                  {selectedLog.success ? 'Success' : 'Failed'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Request ID: {selectedLog.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40">
                <div>
                  <span className="text-muted-foreground text-[10px]">User:</span>
                  <p className="font-medium truncate">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Model:</span>
                  <p className="font-medium">{selectedLog.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Route:</span>
                  <p className="font-medium flex items-center gap-1">
                    {selectedLog.route}
                    <span className="text-[10px] text-muted-foreground">
                      ({Math.round((selectedLog.routerConfidence || 1) * 100)}%)
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Latency:</span>
                  <p className="font-medium font-mono">{selectedLog.processingTime} seconds</p>
                </div>
              </div>

              {selectedLog.routerReasoning && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground text-[10px]">
                    Router Reasoning:
                  </span>
                  <p className="p-2 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 border border-purple-200/50 text-xs">
                    {selectedLog.routerReasoning}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground text-[10px]">Question / Prompt:</span>
                <div className="p-2.5 rounded-lg bg-background border font-mono text-[11px] whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {selectedLog.query}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground text-[10px]">
                  Generated Response (Snippet):
                </span>
                <div className="p-2.5 rounded-lg bg-background border text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {selectedLog.answer || (selectedLog.errorMessage ? `Error: ${selectedLog.errorMessage}` : 'No response text')}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
