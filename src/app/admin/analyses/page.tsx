'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Search,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdminAnalysisRecord {
  id: string;
  status: string;
  myUrl: string;
  competitorUrl: string;
  errorMessage: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  sales: {
    target: { sales: number; price: number } | null;
    competitor: { sales: number; price: number } | null;
  };
}

export default function AdminAnalysesPage() {
  const [analyses, setAnalyses] = useState<AdminAnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAnalyses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analyses?limit=50');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin role required');
        throw new Error(`Failed to load analyses (${res.status})`);
      }
      const json = await res.json();
      setAnalyses(json.analyses || []);
    } catch (err: any) {
      setError(err.message || 'Error loading analyses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Delete analysis record for "${url}"? This cannot be undone.`)) return;

    setDeletingId(id);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/analyses/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete analysis');
      }

      setActionSuccess('Analysis deleted successfully.');
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAnalyses = analyses.filter(
    (a) =>
      a.myUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.competitorUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Global Competitive Analyses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit public comparisons, scraped Envato sales benchmarks, and telemetry logs across all users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by URL or user email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border"
            />
          </div>
          <Button
            onClick={fetchAnalyses}
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Compared Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sales Snapshot</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-400" />
                    Loading global analyses...
                  </td>
                </tr>
              ) : filteredAnalyses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No analyses match your criteria.
                  </td>
                </tr>
              ) : (
                filteredAnalyses.map((item) => {
                  const isDeleting = deletingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.user.name || 'Anonymous'}</div>
                        <div className="text-[11px] text-muted-foreground">{item.user.email}</div>
                      </td>

                      {/* Products */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <span className="text-[10px] uppercase font-mono px-1 rounded bg-muted text-muted-foreground">
                              Target
                            </span>
                            <span className="truncate max-w-[220px]">
                              {item.myUrl.replace(/https?:\/\/(www\.)?/, '')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="text-[10px] uppercase font-mono px-1 rounded bg-muted/60 text-muted-foreground">
                              Comp
                            </span>
                            <span className="truncate max-w-[220px]">
                              {item.competitorUrl.replace(/https?:\/\/(www\.)?/, '')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'COMPLETED'
                              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]'
                              : item.status === 'FAILED'
                              ? 'border-red-500/30 text-red-400 bg-red-500/10 text-[10px]'
                              : 'border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px]'
                          }
                        >
                          {item.status}
                        </Badge>
                        {item.errorMessage && (
                          <div className="text-[10px] text-red-400/90 truncate max-w-[160px] mt-0.5">
                            {item.errorMessage}
                          </div>
                        )}
                      </td>

                      {/* Sales Benchmarks */}
                      <td className="px-4 py-3">
                        {item.sales.target || item.sales.competitor ? (
                          <div className="space-y-0.5 text-[11px]">
                            {item.sales.target && (
                              <div className="flex items-center gap-1 text-emerald-400">
                                <TrendingUp className="h-3 w-3" />
                                <span>Target: {item.sales.target.sales.toLocaleString()} sales</span>
                              </div>
                            )}
                            {item.sales.competitor && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>Comp: {item.sales.competitor.sales.toLocaleString()} sales</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/analysis/${item.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => handleDelete(item.id, item.myUrl)}
                            className="h-7 text-[11px] px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
