'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    deactivatedUsers: number;
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    processingAnalyses: number;
    totalSalesSnapshots: number;
  };
  recentAnalyses: Array<{
    id: string;
    status: string;
    myUrl: string;
    competitorUrl: string;
    createdAt: string;
    user?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    _count: {
      analyses: number;
    };
  }>;
  recentFailures: Array<{
    id: string;
    myUrl: string;
    competitorUrl: string;
    errorMessage: string | null;
    createdAt: string;
    user?: {
      email: string;
    } | null;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin privilege required');
        throw new Error(`Failed to load admin stats (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching admin statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        <p className="text-sm">Loading admin telemetry and database stats...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-red-300">Admin Telemetry Error</h3>
        <p className="text-xs text-red-400/90 mt-1">{error || 'Could not load data'}</p>
        <Button onClick={fetchStats} variant="outline" size="sm" className="mt-4 text-xs">
          Try Again
        </Button>
      </div>
    );
  }

  const overview = data?.overview || {
    totalUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    totalAnalyses: 0,
    completedAnalyses: 0,
    failedAnalyses: 0,
    processingAnalyses: 0,
    totalSalesSnapshots: 0,
  };
  const recentAnalyses = data?.recentAnalyses || [];
  const recentUsers = data?.recentUsers || [];
  const recentFailures = data?.recentFailures || [];
  const successRate = overview.totalAnalyses > 0
    ? Math.round((overview.completedAnalyses / overview.totalAnalyses) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* System Health Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-card/50 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground">PostgreSQL & Session Auth Connected</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">Multi-tenant User Scoping Enforced</span>
        </div>
        <Button
          onClick={fetchStats}
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Stats
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overview.totalUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-medium">{overview.activeUsers} active</span>
              {overview.deactivatedUsers > 0 && (
                <span className="text-amber-400 font-medium">{overview.deactivatedUsers} inactive</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Analyses */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Analysis Jobs</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overview.totalAnalyses}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-medium">{overview.completedAnalyses} completed</span>
              {overview.failedAnalyses > 0 && (
                <span className="text-red-400 font-medium">{overview.failedAnalyses} failed</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{successRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Deterministic rule-based pipeline
            </p>
          </CardContent>
        </Card>

        {/* Sales Snapshots */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Envato Sales Snapshots</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overview.totalSalesSnapshots}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Historical scrape snapshots tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dual Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analysis Jobs */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Recent Analysis Jobs</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Global comparisons across all users</p>
            </div>
            <Link href="/admin/analyses">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-400 hover:text-purple-300">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAnalyses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No analysis jobs recorded yet.</p>
            ) : (
              recentAnalyses.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-muted/20 text-xs hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                        {job.myUrl.replace(/https?:\/\/(www\.)?/, '')}
                      </span>
                      <span className="text-muted-foreground text-[10px]">vs</span>
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {job.competitorUrl.replace(/https?:\/\/(www\.)?/, '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>User: {job.user?.email || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        job.status === 'COMPLETED'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]'
                          : job.status === 'FAILED'
                          ? 'border-red-500/30 text-red-400 bg-red-500/10 text-[10px]'
                          : 'border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px]'
                      }
                    >
                      {job.status}
                    </Badge>
                    <Link href={`/analysis/${job.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recently Registered Users */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Registered Users</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Platform accounts and activity status</p>
            </div>
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-400 hover:text-purple-300">
                Manage Users
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-muted/20 text-xs hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{u.name || u.email.split('@')[0]}</span>
                    <Badge
                      variant="outline"
                      className={
                        u.role === 'admin'
                          ? 'border-purple-500/40 text-purple-400 bg-purple-500/10 text-[9px] uppercase font-mono'
                          : 'border-border text-muted-foreground text-[9px] uppercase font-mono'
                      }
                    >
                      {u.role}
                    </Badge>
                    {!u.isActive && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[9px]">
                        Deactivated
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="truncate">{u.email}</span>
                    <span>•</span>
                    <span>{u._count.analyses} analyses</span>
                  </div>
                </div>

                <div className="text-right text-[10px] text-muted-foreground">
                  <div>Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                  <div className="text-foreground/70">
                    {u.lastLoginAt ? `Active ${new Date(u.lastLoginAt).toLocaleDateString()}` : 'Never logged in'}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Error / Failure Telemetry */}
      {recentFailures.length > 0 && (
        <Card className="border-red-500/20 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-4 w-4" />
              <CardTitle className="text-sm font-semibold text-red-300">Recent Pipeline Failures</CardTitle>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Scraping exceptions and blocked network targets recorded by the backend
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentFailures.map((failure) => (
              <div
                key={failure.id}
                className="p-3 rounded-md border border-red-500/10 bg-red-500/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-foreground">{failure.myUrl}</div>
                  <div className="text-[11px] text-red-300/90 mt-0.5">
                    Error: {failure.errorMessage || 'Unknown extraction error'}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0 text-right">
                  <div>User: {failure.user?.email || 'Anonymous'}</div>
                  <div>{new Date(failure.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
